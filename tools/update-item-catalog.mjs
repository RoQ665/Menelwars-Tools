import fs from "node:fs";
import vm from "node:vm";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Podaj ścieżkę do pliku JSON z listą przedmiotów.");

const catalogPath = new URL("../item-catalog.js", import.meta.url);
const source = fs.readFileSync(catalogPath, "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const catalog = context.window.MENELWARS_GAME_ITEMS;
if (!Array.isArray(catalog)) throw new Error("Nie udało się odczytać obecnego katalogu.");

const payload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (!Array.isArray(payload.items)) throw new Error("Plik nie zawiera tablicy items.");

const byId = new Map(catalog.map(row => [Number(row[0]), row]));
const slotHints = new Map();
for (const item of payload.items) {
  const existing = byId.get(Number(item.item_id));
  const slot = Number(item.equipment_slot_id) || 0;
  if (!existing || !slot) continue;
  const key = `${existing[3]}\u0000${existing[4]}`;
  const counts = slotHints.get(slot) || new Map();
  counts.set(key, (counts.get(key) || 0) + 1);
  slotHints.set(slot, counts);
}

function classification(item) {
  const slot = Number(item.equipment_slot_id) || 0;
  const counts = slotHints.get(slot);
  if (counts?.size) {
    const [key] = [...counts].sort((a, b) => b[1] - a[1])[0];
    return key.split("\u0000");
  }
  return ["other", ""];
}

let added = 0;
let refreshed = 0;
for (const item of payload.items) {
  const id = Number(item.item_id);
  if (!Number.isSafeInteger(id) || !String(item.name || "").trim()) continue;
  const name = String(item.name).trim();
  const icon = String(item.icon_url || "").trim();
  const existing = byId.get(id);
  if (existing) {
    if (existing[1] !== name || (icon && existing[2] !== icon)) refreshed++;
    existing[1] = name;
    if (icon) existing[2] = icon;
  } else {
    const [group, subtitle] = classification(item);
    const row = [id, name, icon, group, subtitle];
    catalog.push(row);
    byId.set(id, row);
    added++;
  }
}

catalog.sort((a, b) => String(a[1]).localeCompare(String(b[1]), "pl", { sensitivity: "base" }) || Number(a[0]) - Number(b[0]));
const output = `"use strict";\n// Katalog wygenerowany z danych gry. [id, nazwa, ikona, grupa, opis grupy]\nwindow.MENELWARS_GAME_ITEMS=${JSON.stringify(catalog)};\n`;
fs.writeFileSync(catalogPath, output);
console.log(JSON.stringify({ previous: catalog.length - added, incoming: payload.items.length, added, refreshed, total: catalog.length }));
