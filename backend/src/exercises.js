/**
 * Desafios de exercícios fáceis para fazer em casa, sem equipamento.
 * Gasto estimado pelo MET (Compendium of Physical Activities):
 * kcal = MET × 3,5 × peso (kg) ÷ 200 × minutos. O tempo inclui os descansos entre as séries.
 */
export const EXERCISES = [
  { id: 'polichinelo', name: 'Polichinelo', dose: '3 séries de 20', minutes: 3, met: 8, tip: 'Abra e feche braços e pernas no ritmo; descanse 30 s entre as séries.' },
  { id: 'marcha', name: 'Marcha parada', dose: '5 minutos', minutes: 5, met: 4, tip: 'Marche no lugar elevando bem os joelhos e balançando os braços.' },
  { id: 'agachamento', name: 'Agachamento', dose: '3 séries de 12', minutes: 4, met: 5, tip: 'Pés na largura dos ombros; desça como se fosse sentar numa cadeira.' },
  { id: 'flexao_parede', name: 'Flexão na parede', dose: '3 séries de 10', minutes: 3, met: 3.8, tip: 'Mãos na parede na altura do peito; dobre os cotovelos e empurre.' },
  { id: 'abdominal', name: 'Abdominal curto', dose: '3 séries de 15', minutes: 4, met: 3.8, tip: 'Deitado, joelhos dobrados; tire só os ombros do chão.' },
  { id: 'prancha', name: 'Prancha', dose: '3 × 20 segundos', minutes: 3, met: 3.8, tip: 'Antebraços no chão e corpo reto; pode apoiar os joelhos.' },
  { id: 'ponte', name: 'Ponte de glúteo', dose: '3 séries de 15', minutes: 4, met: 3.5, tip: 'Deitado, joelhos dobrados; suba o quadril e contraia o glúteo.' },
  { id: 'afundo', name: 'Afundo alternado', dose: '2 × 10 cada perna', minutes: 4, met: 4, tip: 'Dê um passo à frente e desça o joelho de trás perto do chão.' },
  { id: 'panturrilha', name: 'Elevação de panturrilha', dose: '3 séries de 20', minutes: 3, met: 3, tip: 'Fique na ponta dos pés e desça devagar; segure numa parede.' },
  { id: 'corrida_parada', name: 'Corrida parada', dose: '3 × 1 minuto', minutes: 4, met: 7, tip: 'Corra no lugar em ritmo confortável; 20 s de pausa entre as séries.' },
  { id: 'degrau', name: 'Subir e descer degrau', dose: '5 minutos', minutes: 5, met: 6, tip: 'Use o primeiro degrau da escada e alterne a perna que sobe.' },
  { id: 'danca', name: 'Dançar', dose: '10 minutos', minutes: 10, met: 5, tip: 'Coloque músicas animadas e mexa o corpo todo.' },
  { id: 'caminhada', name: 'Caminhada pela casa', dose: '15 minutos', minutes: 15, met: 3, tip: 'Ande pela casa ou quintal em passo firme.' },
  { id: 'alongamento', name: 'Alongamento', dose: '10 minutos', minutes: 10, met: 2.3, tip: 'Alongue pescoço, braços, costas e pernas, 20 s em cada posição.' },
];

/** Peso usado quando a pessoa ainda não registrou nenhuma pesagem. */
export const DEFAULT_WEIGHT_KG = 70;

export const findExercise = (id) => EXERCISES.find((e) => e.id === id) || null;

export function exerciseKcal(exercise, weightKg) {
  return Math.max(1, Math.round((exercise.met * 3.5 * (weightKg || DEFAULT_WEIGHT_KG) * exercise.minutes) / 200));
}
