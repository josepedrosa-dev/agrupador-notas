/**
 * Motor de Agrupamento Geográfico Inteligente para Ordens de Serviço (Notas)
 * Implementa Haversine, K-Means de semente, Atribuição com restrição de tipos,
 * Fallback de tipos, Limitador de Capacidade por Raio e Roteamento TSP (Vizinho mais próximo).
 */

class GeocodingUtils {
    /**
     * Calcula a distância de Haversine em metros entre dois pontos coordenados.
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
     * Calcula o centróide geográfico de uma lista de pontos.
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
     * Calcula o raio real de um grupo de notas (maior distância de qualquer nota até o centróide).
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
     * Resolve a rota do Caixeiro Viajante (TSP) usando a heurística do Vizinho Mais Próximo.
     * Retorna a lista de notas ordenada pela rota ótima.
     */
    static solveTSP(notes, startPoint = null) {
        if (notes.length <= 1) return notes;
        
        const unvisited = [...notes];
        const route = [];
        
        // Ponto de início é a primeira nota ou o centróide fictício
        let current = startPoint || unvisited.shift();
        if (!startPoint) {
            route.push(current);
        } else {
            // Se startPoint é apenas coordenadas, acha a mais próxima para iniciar
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
     * Executa o algoritmo de agrupamento geográfico.
     * @param {Array} notes - Todas as notas do técnico.
     * @param {number} numTeams - Quantidade de equipes.
     * @param {number} notesPerTeam - Total de notas por equipe (ex: 6).
     * @param {Object} composition - Objeto com a cota ideal (ex: { MDFC: 4, ALGC: 2 }).
     * @param {number} maxRadius - Raio limite configurado em metros.
     */
    static groupNotes(notes, numTeams, notesPerTeam, composition, maxRadius) {
        // Clonar as notas para não alterar a base original
        let availableNotes = notes.map(n => ({ ...n, latitude: parseFloat(n.latitude), longitude: parseFloat(n.longitude) }));
        
        const teams = [];
        const warnings = [];
        
        // 1. Inicializar equipes. O número de equipes é fixo conforme escolha do usuário.
        const actualTeamsCount = Math.min(numTeams, availableNotes.length);
        if (actualTeamsCount < numTeams && availableNotes.length > 0) {
            warnings.push({
                type: 'info',
                message: `A quantidade de equipes foi reduzida de ${numTeams} para ${actualTeamsCount} porque existem apenas ${availableNotes.length} notas disponíveis.`
            });
        }

        // 2. Definir Sementes de Equipe (Centróides Iniciais)
        // Para posicionar as equipes de forma inteligente, fazemos um K-Means simplificado
        // focado nas notas do tipo mais requisitado na composição.
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
                compositionStatus: {}, // Acompanha quantos de cada tipo já foram alocados
                radius: 0
            });
        }

        // 3. Alocação em Duas Fases
        // FASE 3A: Alocação dos tipos EXATOS solicitados dentro do raio R
        this.allocateExactTypes(teams, availableNotes, composition, maxRadius, warnings);

        // FASE 3B: Tratamento de Falta de Notas (Substituição por outros tipos)
        this.allocateFallbacks(teams, availableNotes, notesPerTeam, maxRadius, warnings);

        // FASE 3C: Limitação de capacidade por Raio (Se mesmo com fallback não atingir a capacidade, mantemos apenas o disponível)
        this.finalizeTeams(teams, warnings);

        // 4. Resolver Rota TSP para cada equipe e recalcular Centróides Finais
        teams.forEach(team => {
            if (team.assignedNotes.length > 0) {
                // Centróide final real das notas atribuídas
                team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
                // Resolver Rota sugerida de execução
                team.assignedNotes = GeocodingUtils.solveTSP(team.assignedNotes, team.centroid);
                // Calcular raio geográfico final real
                team.radius = GeocodingUtils.calculateMaxRadius(team.assignedNotes, team.centroid);
            }
        });

        // Notas que restaram sem ser atribuídas a nenhuma equipe
        const unassignedNotes = availableNotes;

        return {
            teams,
            unassignedNotes,
            warnings
        };
    }

    /**
     * Inicializa centróides pegando pontos bem distribuídos geograficamente (K-Means++ simplificado).
     */
    static initializeCentroids(notes, k) {
        if (notes.length === 0) return [];
        const centroids = [notes[0]];
        
        while (centroids.length < k && centroids.length < notes.length) {
            let maxMinDist = -1;
            let bestCandidate = null;

            notes.forEach(note => {
                if (centroids.includes(note)) return;
                
                // Acha a menor distância deste ponto até qualquer centróide já escolhido
                let minDist = Infinity;
                centroids.forEach(c => {
                    const d = GeocodingUtils.haversineDistance(note.latitude, note.longitude, c.latitude, c.longitude);
                    if (d < minDist) minDist = d;
                });

                // Queremos o ponto que está mais longe dos centróides existentes (distribuição máxima)
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
        // Para cada tipo na composição (ordenados por maior quantidade necessária primeiro)
        const sortedTypes = Object.keys(composition).sort((a, b) => composition[b] - composition[a]);

        sortedTypes.forEach(type => {
            const targetCount = composition[type];

            // Tenta preencher a cota de cada equipe vaga por vaga
            for (let slot = 0; slot < targetCount; slot++) {
                teams.forEach(team => {
                    // Encontra a nota disponível desse tipo que está mais próxima do centróide da equipe
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

                    // Se encontrou uma nota desse tipo e está dentro do raio limite
                    if (closestNoteIdx !== -1 && minDist <= maxRadius) {
                        const assignedNote = availableNotes.splice(closestNoteIdx, 1)[0];
                        team.assignedNotes.push(assignedNote);
                        team.compositionStatus[type] = (team.compositionStatus[type] || 0) + 1;
                        
                        // Atualiza dinamicamente o centróide temporário para atrair as próximas notas do grupo
                        team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
                    }
                });
            }
        });
    }

    /**
     * Fase 3B: Completa as vagas restantes com QUALQUER outro tipo disponível dentro do raio.
     * Gera os avisos exigidos pelo usuário.
     */
    static allocateFallbacks(teams, availableNotes, notesPerTeam, maxRadius, warnings) {
        teams.forEach(team => {
            const currentCount = team.assignedNotes.length;
            const needed = notesPerTeam - currentCount;

            if (needed <= 0) return;

            let fallbackCount = 0;

            // Busca qualquer nota disponível mais próxima dentro do raio R
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
                    // Atualiza centróide
                    team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
                }
            }

            if (fallbackCount > 0) {
                warnings.push({
                    type: 'warning',
                    teamId: team.id,
                    message: `A ${team.name} teve ${fallbackCount} nota(s) preenchida(s) com outros tipos devido à falta de tipos solicitados dentro do raio de ${maxRadius}m.`
                });
            }
        });
    }

    /**
     * Fase 3C: Se após todas as tentativas, a equipe ainda não tiver a quantidade requisitada
     * (porque não há notas suficientes dentro do raio limitador de nenhuma espécie),
     * mantém-se a quantidade disponível (ex: 4 notas em vez de 6).
     */
    static finalizeTeams(teams, warnings) {
        teams.forEach(team => {
            // Apenas verifica se a equipe ficou com menos notas do que o ideal originalmente pedido
            // mas não há o que fazer, mantém a quantidade disponível localmente respeitando o raio.
            const totalAssigned = team.assignedNotes.length;
            if (totalAssigned === 0) {
                warnings.push({
                    type: 'danger',
                    teamId: team.id,
                    message: `A ${team.name} ficou vazia! Nenhuma nota de qualquer tipo pôde ser encontrada dentro do raio limite de ação.`
                });
            } else {
                // Alerta informativo caso tenha ficado com capacidade reduzida
                // Isso cobre o exemplo do usuário: "usuário pede 6 notas mas só é possível distribuir 4"
                warnings.push({
                    type: 'info',
                    teamId: team.id,
                    count: totalAssigned,
                    message: `${team.name} finalizada com ${totalAssigned} notas atribuídas (capacidade ajustada respeitando o raio limite).`
                });
            }
        });
    }
}
