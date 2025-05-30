const db = require('../db');

// 1. Find all contacts that match email or phone number
exports.findMatchingContacts = (email, phoneNumber, callback) => {
  const query = `
    SELECT * FROM Contact 
    WHERE email = ? OR phoneNumber = ? 
    ORDER BY createdAt ASC`;
  db.query(query, [email, phoneNumber], callback);
};

// 2. Create a new contact
exports.createContact = (email, phoneNumber, linkedId, linkPrecedence, callback) => {
  const query = `
    INSERT INTO Contact (email, phoneNumber, linkedId, linkPrecedence, createdAt, updatedAt) 
    VALUES (?, ?, ?, ?, NOW(), NOW())`;
  db.query(query, [email, phoneNumber, linkedId, linkPrecedence], callback);
};

// 3. General-purpose contact updater (used to change precedence or linking)
exports.updateContact = (id, updates) => {
  const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
  const values = Object.values(updates);
  const query = `UPDATE Contact SET ${fields}, updatedAt = NOW() WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.query(query, [...values, id], (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// 4. Get all contacts linked to a specific primary contact
exports.getAllRelatedContacts = (primaryId, callback) => {
  const query = `
    SELECT * FROM Contact 
    WHERE id = ? OR linkedId = ?`;
  db.query(query, [primaryId, primaryId], callback);
};

// 5. Recursively find all related contacts (transitive closure)
exports.getAllRelatedContactsFromAny = (startingContacts, callback) => {
  const visited = new Set();
  const queue = [...startingContacts.map(c => c.id)];
  const relatedContacts = [];

  const fetchRelated = () => {
    if (queue.length === 0) {
      return callback(null, relatedContacts);
    }

    const currentId = queue.shift();
    if (visited.has(currentId)) {
      return fetchRelated();
    }

    visited.add(currentId);

    const query = `
      SELECT * FROM Contact
      WHERE id = ? OR linkedId = ?`;
    db.query(query, [currentId, currentId], (err, results) => {
      if (err) return callback(err);

      for (const contact of results) {
        if (!visited.has(contact.id)) {
          queue.push(contact.id);
        }
        relatedContacts.push(contact);
      }

      fetchRelated();
    });
  };

  fetchRelated();
};
