import shipsCsv from "../../data/ships.csv?raw";
import { parseShips } from "../domain/parse.ts";
import { scoreAll } from "../domain/score.ts";

export const ships = parseShips(shipsCsv);
export const scores = scoreAll(ships);
