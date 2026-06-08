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
     * @param {Object} startPoint - Ponto de partida inicial.
     * @param {Array} priorityOrder - Ordem de criterios de priorizacao.
     */
    static groupNotes(notes, numTeams, notesPerTeam, composition, maxRadius, startPoint = null, priorityOrder = ['prioridade', 'prazo', 'tipo', 'distancia']) {
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
        const dominantNotes = dominantType ? availableNotes.filter(n => n.tipo === dominantType) : [];
        
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

        // 3. Alocacao Unificada baseada na Ordem de Prioridades
        this.allocateNotesUnified(teams, availableNotes, composition, notesPerTeam, maxRadius, priorityOrder, warnings);

        // 3B. Limitacao de capacidade por Raio
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
     * Compara duas notas para determinar qual e a melhor para a equipe de acordo com a prioridade.
     * Retorna -1 se noteA for melhor, 1 se noteB for melhor, e 0 se empatarem.
     */
    static compareNotes(noteA, noteB, team, priorityOrder, composition) {
        for (const criterion of priorityOrder) {
            if (criterion === 'prioridade') {
                if (noteA.prioridade && !noteB.prioridade) return -1;
                if (!noteA.prioridade && noteB.prioridade) return 1;
            } else if (criterion === 'prazo') {
                const dateA = noteA.prazoDate ? new Date(noteA.prazoDate).getTime() : null;
                const dateB = noteB.prazoDate ? new Date(noteB.prazoDate).getTime() : null;

                if (dateA !== null && dateB === null) return -1;
                if (dateA === null && dateB !== null) return 1;
                if (dateA !== null && dateB !== null) {
                    if (dateA < dateB) return -1;
                    if (dateA > dateB) return 1;
                }
            } else if (criterion === 'tipo') {
                const neededA = (composition[noteA.tipo] || 0) - (team.compositionStatus[noteA.tipo] || 0) > 0;
                const neededB = (composition[noteB.tipo] || 0) - (team.compositionStatus[noteB.tipo] || 0) > 0;

                if (neededA && !neededB) return -1;
                if (!neededA && neededB) return 1;
            } else if (criterion === 'distancia') {
                const distA = GeocodingUtils.haversineDistance(
                    team.centroid.latitude, team.centroid.longitude,
                    noteA.latitude, noteA.longitude
                );
                const distB = GeocodingUtils.haversineDistance(
                    team.centroid.latitude, team.centroid.longitude,
                    noteB.latitude, noteB.longitude
                );

                if (distA < distB) return -1;
                if (distA > distB) return 1;
            }
        }
        return 0;
    }

    /**
     * Alocacao de notas unificada baseada na prioridade multicriterio.
     */
    static allocateNotesUnified(teams, availableNotes, composition, notesPerTeam, maxRadius, priorityOrder, warnings) {
        for (let slot = 0; slot < notesPerTeam; slot++) {
            // Desempate: equipes com MENOS notas tem prioridade para escolher seu proximo slot (justica de distribuicao)
            const teamsInPriorityOrder = [...teams].sort((a, b) => a.assignedNotes.length - b.assignedNotes.length);
            
            teamsInPriorityOrder.forEach(team => {
                if (team.assignedNotes.length >= notesPerTeam) return;

                let bestNoteIdx = -1;

                for (let i = 0; i < availableNotes.length; i++) {
                    const note = availableNotes[i];

                    const dist = GeocodingUtils.haversineDistance(
                        team.centroid.latitude, team.centroid.longitude,
                        note.latitude, note.longitude
                    );

                    if (dist > maxRadius) continue;

                    if (bestNoteIdx === -1) {
                        bestNoteIdx = i;
                    } else {
                        const currentBest = availableNotes[bestNoteIdx];
                        const comparison = this.compareNotes(note, currentBest, team, priorityOrder, composition);
                        if (comparison < 0) {
                            bestNoteIdx = i;
                        }
                    }
                }

                if (bestNoteIdx !== -1) {
                    const assignedNote = availableNotes.splice(bestNoteIdx, 1)[0];
                    team.assignedNotes.push(assignedNote);
                    
                    const type = assignedNote.tipo;
                    team.compositionStatus[type] = (team.compositionStatus[type] || 0) + 1;
                    
                    // Atualiza centroide dinamicamente
                    team.centroid = GeocodingUtils.getCentroid(team.assignedNotes);
                }
            });
        }

        // Gera os avisos de fallback comparando a cota exigida com a distribuicao real obtida
        teams.forEach(team => {
            let fallbackCount = 0;
            Object.entries(team.compositionStatus).forEach(([type, count]) => {
                const target = composition[type] || 0;
                if (count > target) {
                    fallbackCount += (count - target);
                }
            });

            if (fallbackCount > 0) {
                warnings.push({
                    type: 'warning',
                    teamId: team.id,
                    message: `A ${team.name} teve ${fallbackCount} nota(s) preenchida(s) com tipos de fallbacks ou alem do ideal devido a priorizacao/falta de tipo dentro de ${maxRadius}m.`
                });
            }
        });
    }

    /**
     * Fase finalizadora de capacidade.
     */
    static finalizeTeams(teams, warnings) {
        teams.forEach(team => {
            const totalAssigned = team.assignedNotes.length;
            if (totalAssigned === 0) {
                warnings.push({
                    type: 'danger',
                    teamId: team.id,
                    message: `A ${team.name} ficou vazia! Nenhuma nota de qualquer tipo pode ser encontrada dentro do raio limite de acao.`
                });
            } else {
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
