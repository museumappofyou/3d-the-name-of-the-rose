// Physical routes of the novel (book_details/output/movement_graph.json),
// as waypoints [x, feetY, z] walked by the audit bot (?debug, __audit.routes()).
import { ROUTES_AED } from './routes_aed.js';
import { ROUTES_GROUNDS } from './routes_grounds.js';
export const ROUTES = [...ROUTES_AED, ...ROUTES_GROUNDS];
