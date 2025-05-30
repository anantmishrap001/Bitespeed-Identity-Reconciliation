const contactModel = require('../models/contactModel');

exports.identify = (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'email or phoneNumber required' });
  }

  // Step 1: Find initial matching contacts
  contactModel.findMatchingContacts(email, phoneNumber, async (err, contacts) => {
    if (err) return res.status(500).json({ error: err.message });

    // Step 2: No matches, create a new primary contact
    if (contacts.length === 0) {
      contactModel.createContact(email, phoneNumber, null, 'primary', (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const response = {
          contact: {
            primaryContatctId: result.insertId,
            emails: [email],
            phoneNumbers: [phoneNumber],
            secondaryContactIds: []
          }
        };
        return res.status(200).json(response);
      });
    } else {
      // Step 3: Matches found — fetch all related contacts (transitively)
      contactModel.getAllRelatedContactsFromAny(contacts, (err, allRelated) => {
        if (err) return res.status(500).json({ error: err.message });

        // Step 4: Identify the oldest primary contact
        const primary = allRelated
          .filter(c => c.linkPrecedence === 'primary')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];

        // Step 5: Demote any other primaries
        const updates = allRelated
          .filter(c => c.id !== primary.id && c.linkPrecedence === 'primary')
          .map(c => contactModel.updateContact(c.id, {
            linkPrecedence: 'secondary',
            linkedId: primary.id,
          }));

        // Step 6: Ensure demotion completes, then maybe insert new contact
        Promise.all(updates).then(() => {
          const existingEmails = allRelated.map(c => c.email);
          const existingPhones = allRelated.map(c => c.phoneNumber);

          const needsNewEntry =
            (email && !existingEmails.includes(email)) ||
            (phoneNumber && !existingPhones.includes(phoneNumber));

          const insertNew = (callback) => {
            if (needsNewEntry) {
              contactModel.createContact(email, phoneNumber, primary.id, 'secondary', callback);
            } else {
              callback(null, { insertId: null });
            }
          };

          insertNew((err, newRow) => {
            if (err) return res.status(500).json({ error: err.message });

            // Step 7: Fetch final merged contact info
            contactModel.getAllRelatedContacts(primary.id, (err, finalContacts) => {
              if (err) return res.status(500).json({ error: err.message });

              const emails = [...new Set(finalContacts.map(c => c.email).filter(Boolean))];
              const phones = [...new Set(finalContacts.map(c => c.phoneNumber).filter(Boolean))];
              const secondaryIds = finalContacts
                .filter(c => c.linkPrecedence === 'secondary')
                .map(c => c.id);

              return res.status(200).json({
                contact: {
                  primaryContatctId: primary.id,
                  emails,
                  phoneNumbers: phones,
                  secondaryContactIds: secondaryIds,
                }
              });
            });
          });
        });
      });
    }
  });
};
