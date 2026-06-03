/**
 * Motor de Agrupamento Geografico Inteligente para Ordens de Servico (Notas)
 * Implementa Haversine, K-Means de semente, Atribuicao com restricao de tipos,
 * Fallback de tipos, Limitador de Capacidade por Raio e Roteamento TSP (Vizinho mais proximo).
 */

class GeocodingUtils {
    /**
     * Calcula a distancia de Haversine em metros entre dois pontos coordenados.
     */
    static haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Raio da Terra em metros
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Retorna em metros
    }

    /**
     * Calcula o centroide geografico de uma lista de pontos.
     */
    static getCentroid(points) {
        if (!points || points.length === 0) return null;
        let sumLat = 0;
        let sumLng = 0;
        points.forEach(p => {
            sumLat += p.latitude;
            sumLng += p.longitude;
        });
        return {
            latitude: sumLat / points.length,
            longitude: sumLng / points.length
        };
    }

    /**
     * Calcula o raio real de um grupo de notas (maior distancia de qualquer nota ate o centroide).
     */
    static calculateMaxRadius(notes, centroid) {
        if (!notes || notes.length <= 1 || !centroid) return 0;
        let maxDist = 0;
        notes.forEach(note => {
            const dist = this.haversineDistance(centroid.latitude, centroid.longitude, note.latitude, note.longitude);
            if (dist > maxDist) maxDist = dist;
        });
        return maxDist;
    }

    /**
     * Resolve a rota do Caixeiro Viajante (TSP) usando a heuristica do Vizinho Mais Proximo.
     * Retorna a lista de notas ordenada pela rota otima.
     */
    static solveTSP(notes, startPoint = null) {
        if (notes.length <= 1) return notes;
        
        const unvisited = [...notes];
        const route = [];
        
        // Ponto de inicio e a primeira nota ou o centroide ficticio
        let current = startPoint || unvisited.shift();
        if (!startPoint) {
            route.push(current);
        } else {
            // Se startPoint e apenas coordenadas, acha a mais proxima para iniciar
            let closestIdx = 0;
            let minDist = Infinity;
            for (let i = 0; i < unvisited.length; i++) {
                const d = this.haversineDistance(current.latitude, current.longitude, unvisited[i].latitude, unvisited[i].longitude);
                if (d < minDist) {
                    minDist = d;
                    closestIdx = i;
                }
            }
            current = unvisited.splice(closestIdx, 1)[0];
            route.push(current);
        }

        while (unvisited.length > 0) {
            let closestIdx = -1;
            let minDist = Infinity;
            for (let i = 0; i < unvisited.length; i++) {
                const dist = this.haversineDistance(current.latitude, current.longitude, unvisited[i].latitude, unvisited[i].longitude);
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = i;
                }
            }
            current = unvisited.splice(closestIdx, 1)[0];
            route.push(current);
        }
        return route;
    }
}

class NoteGrouper {
    /**
     * Executa o algoritmo de agrupamento geografico.
     * @param {Array} notes - Todas as notas do tecnico.
     * @param {number} numTeams - Quantidade de equipes.
     * @param {number} notesPerTeam - Total de notas por equipe (ex: 6).
     * @param {Object} composition - Objeto com a cota ideal (ex: { MDFC: 4, ALGC: 2 }).
     * @param {number} maxRadius - Raio limite configurado em metros.
     */
    static groupNotes(notes, numTeams, notesPerTeam, composition, maxRadius, startPoint = null) {
        // Clonar as notas para nao alterar a base original
        let availableNotes = notes.map(n => ({ ...n, latitude: parseFloat(n.latitude), longitude: parseFloat(n.longitude) }));
        
        const teams = [];
        const warnings = [];
        
        // 1. Inicializar equipes. O numero de equipes e fixo conforme escolha do usuario.
        const actualTeamsCount = Math.min(numTeams, availableNotes.length);
        if (actualTeamsCount < numTeams && availableNotes.length > 0) {
            warnings.push({
                type: 'warning',
                message: `O numero de equipes foi ajustado de ${numTeams} para ${actualTeamsCount} porque ha apenas ${availableNotes.length} nota(s) disponivel(is). Reduza o numero de equipes ou adicione mais notas.`
            });
        }

        // 2. Definir Sementes de Equipe (Centroides Iniciais)
        // Para posicionar as equipes de forma inteligente, fazemos um K-Means simplificado
        // focado nas notas do tipo mais requisitado na composicao.
        let seedNotes = [];
        const dominantType = Object.keys(composition).sort((a, b) => composition[b] - composition[a])[0];
        const dominantNotes = availableNotes.filter(n => n.tipo === dominantType);
        
        if (dominantNotes.length >= actualTeamsCount) {
            seedNotes = this.initializeCentroids(dominantNotes, actualTeamsCount);
        } else {
            seedNotes = this.initializeCentroids(availableNotes, actualTeamsCount);
        }

        // Criar objetos de equipes com suas sementes
        for (let i = 0; i < actualTeamsCount; i++) {
            teams.push({
                id: i + 1,
                name: `Equipe ${i + 1}`,
                centroid: { latitude: seedNotes[i].latitude, longitude: seedNotes[i].longitude },
                assignedNotes: [],
                compositionStatus: {}, // Acompanha quantos de cada tipo ja foram alocados
                radius: 0
            });
        }

        // 3. Alocacao em Duas Fases
        // FASE 3A: Alocacao dos tipos EXATOS solicitados dentro do raio R
        this.allocateExactTypes(teams, availableNotes, composition, maxRadius, warnings);

        // FASE 3B: Tratamento de Falta de Notas (Substituicao por outros tipos)
        this.allocateFallbacks(teams, availableNotes, notesPerTeam, maxRadius, warnings);

        // FASE 3C: Limitacao de capacidade por Raio (Se mesmo com fallback nao atingir a capacidade, mantemos apenas o disponivel)
        this.finalizeTeams(teams, warnings);

        // 4. Resolver Rota TSP para cada equipe e recalcular Centroides Finais
        teams.forEach(team => {
            if (team.assignedNotes.length > 0) {
                // Centroide final real das notas atribuidas
                team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
                // Resolver Rota sugerida de execucao
                team.assignedNotes = GeocodingUtils.solveTSP(team.assignedNotes, startPoint || team.centroid);
                // Calcular raio geografico final real
                team.radius = GeocodingUtils.calculateMaxRadius(team.assignedNotes, team.centroid);
            }
        });

        // Notas que restaram sem ser atribuidas a nenhuma equipe
        const unassignedNotes = availableNotes;

        return {
            teams,
            unassignedNotes,
            warnings
        };
    }

    /**
     * Inicializa centroides pegando pontos bem distribuidos geograficamente (K-Means++ simplificado).
     */
    static initializeCentroids(notes, k) {
        if (notes.length === 0) return [];
        const centroids = [notes[0]];
        
        while (centroids.length < k && centroids.length < notes.length) {
            let maxMinDist = -1;
            let bestCandidate = null;

            notes.forEach(note => {
                if (centroids.includes(note)) return;
                
                // Acha a menor distancia deste ponto ate qualquer centroide ja escolhido
                let minDist = Infinity;
                centroids.forEach(c => {
                    const d = GeocodingUtils.haversineDistance(note.latitude, note.longitude, c.latitude, c.longitude);
                    if (d < minDist) minDist = d;
                });

                // Queremos o ponto que esta mais longe dos centroides existentes (distribuicao maxima)
                if (minDist > maxMinDist) {
                    maxMinDist = minDist;
                    bestCandidate = note;
                }
            });

            if (bestCandidate) {
                centroids.push(bestCandidate);
            } else {
                break;
            }
        }
        return centroids;
    }

    /**
     * Fase 3A: Distribui as notas exatamente com o tipo pedido que estejam dentro do raio.
     */
    static allocateExactTypes(teams, availableNotes, composition, maxRadius, warnings) {
        // Para cada tipo na composicao (ordenados por maior quantidade necessaria primeiro)
        const sortedTypes = Object.keys(composition).sort((a, b) => composition[b] - composition[a]);

        sortedTypes.forEach(type => {
            const targetCount = composition[type];

            // Tenta preencher a cota de cada equipe vaga por vaga
            for (let slot = 0; slot < targetCount; slot++) {
                // Desempate: equipes com MENOS notas tem prioridade de escolha (evita dominancia por ordem de criacao)
                const teamsInPriorityOrder = [...teams].sort((a, b) => a.assignedNotes.length - b.assignedNotes.length);
                teamsInPriorityOrder.forEach(team => {
                    // Encontra a nota disponivel desse tipo que esta mais proxima do centroide da equipe
                    let closestNoteIdx = -1;
                    let minDist = Infinity;

                    for (let i = 0; i < availableNotes.length; i++) {
                        const note = availableNotes[i];
                        if (note.tipo !== type) continue;

                        const dist = GeocodingUtils.haversineDistance(
                            team.centroid.latitude, team.centroid.longitude,
                            note.latitude, note.longitude
                        );

                        if (dist < minDist) {
                            minDist = dist;
                            closestNoteIdx = i;
                        }
                    }

                    // Se encontrou uma nota desse tipo e esta dentro do raio limite
                    if (closestNoteIdx !== -1 && minDist <= maxRadius) {
                        const assignedNote = availableNotes.splice(closestNoteIdx, 1)[0];
                        team.assignedNotes.push(assignedNote);
                        team.compositionStatus[type] = (team.compositionStatus[type] || 0) + 1;
                        
                        // Atualiza dinamicamente o centroide temporario para atrair as proximas notas do grupo
                        team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
                    }
                });
            }
        });
    }

    /**
     * Fase 3B: Completa as vagas restantes com QUALQUER outro tipo disponivel dentro do raio.
     * Gera os avisos exigidos pelo usuario.
     */
    static allocateFallbacks(teams, availableNotes, notesPerTeam, maxRadius, warnings) {
        // Desempate: equipes com menos notas recebem fallbacks primeiro
        const sortedTeams = [...teams].sort((a, b) => a.assignedNotes.length - b.assignedNotes.length);
        sortedTeams.forEach(team => {
            const currentCount = team.assignedNotes.length;
            const needed = notesPerTeam - currentCount;

            if (needed <= 0) return;

            let fallbackCount = 0;

            // Busca qualquer nota disponivel mais proxima dentro do raio R
            for (let slot = 0; slot < needed; slot++) {
                let closestNoteIdx = -1;
                let minDist = Infinity;

                for (let i = 0; i < availableNotes.length; i++) {
                    const note = availableNotes[i];
                    const dist = GeocodingUtils.haversineDistance(
                        team.centroid.latitude, team.centroid.longitude,
                        note.latitude, note.longitude
                    );

                    if (dist < minDist) {
                        minDist = dist;
                        closestNoteIdx = i;
                    }
                }

                if (closestNoteIdx !== -1 && minDist <= maxRadius) {
                    const assignedNote = availableNotes.splice(closestNoteIdx, 1)[0];
                    team.assignedNotes.push(assignedNote);
                    
                    const type = assignedNote.tipo;
                    team.compositionStatus[type] = (team.compositionStatus[type] || 0) + 1;
                    
                    fallbackCount++;
                    // Atualiza centroide
                    team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
                }
            }

            if (fallbackCount > 0) {
                warnings.push({
                    type: 'warning',
                    teamId: team.id,
                    message: `A ${team.name} teve ${fallbackCount} nota(s) preenchida(s) com outros tipos devido a falta de tipos solicitados dentro do raio de ${maxRadius}m.`
                });
            }
        });
    }

    /**
     * Fase 3C: Se apos todas as tentativas, a equipe ainda nao tiver a quantidade requisitada
     * (porque nao ha notas suficientes dentro do raio limitador de nenhuma especie),
     * mantem-se a quantidade disponivel (ex: 4 notas em vez de 6).
     */
    static finalizeTeams(teams, warnings) {
        teams.forEach(team => {
            // Apenas verifica se a equipe ficou com menos notas do que o ideal originalmente pedido
            // mas nao ha o que fazer, mantem a quantidade disponivel localmente respeitando o raio.
            const totalAssigned = team.assignedNotes.length;
            if (totalAssigned === 0) {
                warnings.push({
                    type: 'danger',
                    teamId: team.id,
                    message: `A ${team.name} ficou vazia! Nenhuma nota de qualquer tipo pode ser encontrada dentro do raio limite de acao.`
                });
            } else {
                // Alerta informativo caso tenha ficado com capacidade reduzida
                // Isso cobre o exemplo do usuario: "usuario pede 6 notas mas so e possivel distribuir 4"
                warnings.push({
                    type: 'info',
                    teamId: team.id,
                    count: totalAssigned,
                    message: `${team.name} finalizada com ${totalAssigned} notas atribuidas (capacidade ajustada respeitando o raio limite).`
                });
            }
        });
    }
}
