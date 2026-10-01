// A worked address, not a canonical placement of a named manuscript.
// claim_000423 (EXPLICIT): place, gradus, cabinet, in that order.
// claim_001153 (EXPLICIT): the physical shelf labels match the catalogue.
export const SHELF_EXAMPLE = Object.freeze({ id: 'shelf-example', room: 'E.hall', place: 'ii', gradus: 'III', cabinet: 'I', text: 'ii · III gradus · I' });
export const canAskAlinardo = notes => notes.has('barred') || notes.has('altar-feature');
export const knowsAltar = notes => notes.has('alinardo-hint') || notes.has('altar-passage');
export const canConnectShelf = notes => notes.has('shelf-marks') && notes.has('shelf-example-seen');
