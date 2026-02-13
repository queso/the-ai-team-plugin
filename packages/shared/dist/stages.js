export const ALL_STAGES = [
    'briefings',
    'ready',
    'testing',
    'implementing',
    'review',
    'probing',
    'done',
    'blocked',
];
export const TRANSITION_MATRIX = {
    briefings: ['ready', 'blocked'],
    ready: ['testing', 'implementing', 'probing', 'blocked', 'briefings'],
    testing: ['review', 'blocked'],
    implementing: ['review', 'blocked'],
    probing: ['ready', 'done', 'blocked'],
    review: ['done', 'testing', 'implementing', 'probing', 'blocked'],
    done: [],
    blocked: ['ready'],
};
export function isValidTransition(from, to) {
    return TRANSITION_MATRIX[from].includes(to);
}
export function getValidNextStages(from) {
    return TRANSITION_MATRIX[from];
}
