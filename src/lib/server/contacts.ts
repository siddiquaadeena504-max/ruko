import "server-only";
import { encrypt, randomId } from "./crypto";
import { write } from "./db";
import { HttpError, normalisePhone, str } from "./http";
import { householdContacts, toContact } from "./repo";

const MAX_CONTACTS = 5;

export async function addContact(householdId: string, body: Record<string, unknown>) {
  const name = str(body.name, "Name", { max: 60 });
  const phone = normalisePhone(body.phone);
  const relation = str(body.relation, "Relation", { max: 40, optional: true });
  return write((db) => {
    const existing = householdContacts(db, householdId);
    if (existing.length >= MAX_CONTACTS) throw new HttpError(400, `You can add up to ${MAX_CONTACTS} trusted contacts.`);
    db.contacts.push({
      id: randomId("ct"),
      householdId,
      nameEnc: encrypt(name),
      phoneEnc: encrypt(phone),
      relation,
      priority: existing.length + 1,
      createdAt: new Date().toISOString(),
    });
    return householdContacts(db, householdId).map(toContact);
  });
}

export async function updateContact(householdId: string, id: string, body: Record<string, unknown>) {
  // Validate before entering the write lock.
  const name = body.name !== undefined ? str(body.name, "Name", { max: 60 }) : undefined;
  const phone = body.phone !== undefined ? normalisePhone(body.phone) : undefined;
  const relation = body.relation !== undefined ? str(body.relation, "Relation", { max: 40, optional: true }) : undefined;
  return write((db) => {
    const c = db.contacts.find((x) => x.id === id && x.householdId === householdId);
    if (!c) throw new HttpError(404, "Contact not found");
    if (name !== undefined) c.nameEnc = encrypt(name);
    if (phone !== undefined) c.phoneEnc = encrypt(phone);
    if (relation !== undefined) c.relation = relation;
    if (body.move === "up" || body.move === "down") {
      const list = householdContacts(db, householdId);
      const i = list.findIndex((x) => x.id === id);
      const j = body.move === "up" ? i - 1 : i + 1;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      list.forEach((x, k) => (x.priority = k + 1));
    }
    return householdContacts(db, householdId).map(toContact);
  });
}

export async function removeContact(householdId: string, id: string) {
  return write((db) => {
    db.contacts = db.contacts.filter((x) => !(x.id === id && x.householdId === householdId));
    householdContacts(db, householdId).forEach((x, k) => (x.priority = k + 1));
    return householdContacts(db, householdId).map(toContact);
  });
}
