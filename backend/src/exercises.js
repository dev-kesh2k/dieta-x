/**
 * Desafios de exercícios para fazer em casa, sem equipamento, em níveis de dificuldade.
 * Gasto estimado pelo MET (Compendium of Physical Activities):
 * kcal = (MET − 1) × 3,5 × peso (kg) ÷ 200 × minutos (gasto líquido, sem o repouso que já está no TDEE). O tempo inclui os descansos entre as séries.
 * Um nível libera o seguinte quando todos os desafios dele são cumpridos em UNLOCK_DAYS dias.
 */
export const UNLOCK_DAYS = 3;

export const LEVELS = [
  {
    level: 1,
    name: 'Iniciante',
    description: 'Movimentos simples para criar o hábito.',
    exercises: [
      { id: 'marcha', name: 'Marcha parada', dose: '5 minutos', minutes: 5, met: 4, tip: 'Marche no lugar elevando bem os joelhos e balançando os braços.' },
      { id: 'polichinelo', name: 'Polichinelo', dose: '3 séries de 20', minutes: 3, met: 8, tip: 'Abra e feche braços e pernas no ritmo; descanse 30 s entre as séries.' },
      { id: 'agachamento', name: 'Agachamento', dose: '3 séries de 12', minutes: 4, met: 5, tip: 'Pés na largura dos ombros; desça como se fosse sentar numa cadeira.' },
      { id: 'flexao_parede', name: 'Flexão na parede', dose: '3 séries de 10', minutes: 3, met: 3.8, tip: 'Mãos na parede na altura do peito; dobre os cotovelos e empurre.' },
      { id: 'ponte', name: 'Ponte de glúteo', dose: '3 séries de 15', minutes: 4, met: 3.5, tip: 'Deitado, joelhos dobrados; suba o quadril e contraia o glúteo.' },
      { id: 'panturrilha', name: 'Elevação de panturrilha', dose: '3 séries de 20', minutes: 3, met: 3, tip: 'Fique na ponta dos pés e desça devagar; segure numa parede.' },
      { id: 'caminhada', name: 'Caminhada pela casa', dose: '15 minutos', minutes: 15, met: 3, tip: 'Ande pela casa ou quintal em passo firme.' },
      { id: 'alongamento', name: 'Alongamento', dose: '10 minutos', minutes: 10, met: 2.3, tip: 'Alongue pescoço, braços, costas e pernas, 20 s em cada posição.' },
    ],
  },
  {
    level: 2,
    name: 'Básico',
    description: 'Mais repetições e os primeiros exercícios de abdômen.',
    exercises: [
      { id: 'n2_polichinelo', name: 'Polichinelo', dose: '4 séries de 25', minutes: 5, met: 8, tip: 'Mantenha o ritmo; descanse 30 s entre as séries.' },
      { id: 'n2_agachamento', name: 'Agachamento', dose: '4 séries de 15', minutes: 5, met: 5, tip: 'Desça até as coxas ficarem paralelas ao chão, se conseguir.' },
      { id: 'abdominal', name: 'Abdominal curto', dose: '3 séries de 15', minutes: 4, met: 3.8, tip: 'Deitado, joelhos dobrados; tire só os ombros do chão.' },
      { id: 'prancha', name: 'Prancha', dose: '3 × 20 segundos', minutes: 3, met: 3.8, tip: 'Antebraços no chão e corpo reto; pode apoiar os joelhos.' },
      { id: 'afundo', name: 'Afundo alternado', dose: '2 × 10 cada perna', minutes: 4, met: 4, tip: 'Dê um passo à frente e desça o joelho de trás perto do chão.' },
      { id: 'corrida_parada', name: 'Corrida parada', dose: '3 × 1 minuto', minutes: 4, met: 7, tip: 'Corra no lugar em ritmo confortável; 20 s de pausa entre as séries.' },
      { id: 'degrau', name: 'Subir e descer degrau', dose: '5 minutos', minutes: 5, met: 6, tip: 'Use o primeiro degrau da escada e alterne a perna que sobe.' },
      { id: 'danca', name: 'Dançar', dose: '10 minutos', minutes: 10, met: 5, tip: 'Coloque músicas animadas e mexa o corpo todo.' },
    ],
  },
  {
    level: 3,
    name: 'Intermediário',
    description: 'Exercícios com salto e séries mais longas.',
    exercises: [
      { id: 'n3_polichinelo', name: 'Polichinelo', dose: '5 séries de 30', minutes: 6, met: 8, tip: 'Pouse na ponta dos pés para amortecer.' },
      { id: 'n3_agachamento_salto', name: 'Agachamento com salto', dose: '3 séries de 12', minutes: 5, met: 8, tip: 'Agache e suba saltando; aterrisse com os joelhos levemente dobrados.' },
      { id: 'n3_flexao_joelhos', name: 'Flexão com joelhos no chão', dose: '3 séries de 12', minutes: 4, met: 3.8, tip: 'Corpo reto dos joelhos à cabeça; desça o peito perto do chão.' },
      { id: 'n3_prancha', name: 'Prancha', dose: '3 × 40 segundos', minutes: 4, met: 3.8, tip: 'Contraia abdômen e glúteos; não deixe o quadril cair.' },
      { id: 'n3_afundo', name: 'Afundo alternado', dose: '3 × 12 cada perna', minutes: 6, met: 4, tip: 'Tronco ereto; o joelho da frente não passa da ponta do pé.' },
      { id: 'n3_corrida_joelho', name: 'Corrida parada com joelho alto', dose: '4 × 1 minuto', minutes: 6, met: 8, tip: 'Leve os joelhos até a altura do quadril.' },
      { id: 'n3_escalador', name: 'Escalador (mountain climber)', dose: '3 × 30 segundos', minutes: 4, met: 8, tip: 'Em posição de flexão, traga os joelhos ao peito alternando, rápido.' },
      { id: 'n3_bicicleta', name: 'Abdominal bicicleta', dose: '3 séries de 20', minutes: 4, met: 4, tip: 'Leve o cotovelo ao joelho oposto, alternando os lados.' },
    ],
  },
  {
    level: 4,
    name: 'Avançado',
    description: 'Treino completo e intenso para o corpo todo.',
    exercises: [
      { id: 'n4_burpee', name: 'Burpee', dose: '4 séries de 10', minutes: 6, met: 8, tip: 'Agache, leve os pés para trás, volte e salte com os braços para cima.' },
      { id: 'n4_polichinelo', name: 'Polichinelo', dose: '5 séries de 50', minutes: 8, met: 8, tip: 'Ritmo forte e constante; respire pelo nariz.' },
      { id: 'n4_flexao', name: 'Flexão de braço', dose: '4 séries de 12', minutes: 5, met: 8, tip: 'Corpo reto da cabeça aos pés; desça até quase encostar o peito.' },
      { id: 'n4_agachamento_salto', name: 'Agachamento com salto', dose: '4 séries de 15', minutes: 6, met: 8, tip: 'Salte o mais alto que conseguir e aterrisse suave.' },
      { id: 'n4_prancha', name: 'Prancha', dose: '3 × 1 minuto', minutes: 5, met: 3.8, tip: 'Corpo firme o tempo todo; respire devagar.' },
      { id: 'n4_escalador', name: 'Escalador (mountain climber)', dose: '4 × 40 segundos', minutes: 5, met: 8, tip: 'Mantenha o quadril baixo e o ritmo acelerado.' },
      { id: 'n4_afundo_salto', name: 'Afundo com salto', dose: '3 × 10 cada perna', minutes: 6, met: 8, tip: 'Troque as pernas no ar a cada salto.' },
      { id: 'n4_corda', name: 'Pular corda (sem corda)', dose: '5 × 2 minutos', minutes: 12, met: 8.8, tip: 'Saltinhos na ponta dos pés girando os punhos como se tivesse a corda.' },
    ],
  },
];

/** Peso usado quando a pessoa ainda não registrou nenhuma pesagem. */
export const DEFAULT_WEIGHT_KG = 70;

const ALL = LEVELS.flatMap((l) => l.exercises.map((e) => ({ ...e, level: l.level })));

export const findExercise = (id) => ALL.find((e) => e.id === id) || null;

export function exerciseKcal(exercise, weightKg) {
  // Gasto líquido (MET − 1): o gasto de repouso já está no TDEE e não pode ser descontado duas vezes.
  return Math.max(1, Math.round(((exercise.met - 1) * 3.5 * (weightKg || DEFAULT_WEIGHT_KG) * exercise.minutes) / 200));
}

/**
 * Progresso dos níveis a partir dos dias em que cada exercício foi feito
 * (doneByDay: { 'YYYY-MM-DD': Set<exerciseId> }). O nível 1 está sempre liberado.
 */
export function levelProgress(doneByDay) {
  const days = Object.values(doneByDay);
  let unlocked = true;
  return LEVELS.map((l) => {
    const completeDays = days.filter((set) => l.exercises.every((e) => set.has(e.id))).length;
    const out = { level: l.level, unlocked, completeDays };
    unlocked = unlocked && completeDays >= UNLOCK_DAYS;
    return out;
  });
}
