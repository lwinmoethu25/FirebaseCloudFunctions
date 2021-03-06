const functions = require('firebase-functions');
const admin = require('firebase-admin');
const GeoFire = require('geofire');
admin.initializeApp(functions.config().firebase);
const geoFire = new GeoFire(admin.database().ref('/geofire'));
const gcs = require('@google-cloud/storage')().bucket('hello');

exports.addMessage = functions.https.onRequest((req, res) => {
  const original = req.query.text;
  admin.database().ref('/messages').push({ original: original }).then(snapshot => {
    res.redirect(303, snapshot.ref);
  });
});

// API approach (extra work on Android for setting up Retrofit)
// exports.addUser = functions.https.onRequest((req, res) => {
//   const user = req.body;
//   var newUser = admin.database().ref('/users').push();
//   newUser.set(user).then(snapshot => {
//     var location = [user.latitude, user.longitude];
//     geoFire.set(newUser.key, location).then(function() {
//       res.send(200, "ok");
//     });
//   });
// });

// Trigger approach (no extra work on Android)
exports.saveUser = functions.database.ref('/users/{pushId}')
  .onWrite(event => {
    const user = event.data.val();
    var latitude = event.data.child('latitude');
    var longitude = event.data.child('longitude');
    if (latitude.changed() || longitude.changed()) {
      const location = [user.latitude, user.longitude];
      return geoFire.set(event.params.pushId, location);
    }
  });

exports.sendNotification = functions.https.onRequest((req, res) => {
  const to = req.query.to;
  const title = req.query.title;
  const body = req.query.body;

  var payload;
  if (body != undefined && body !== '') {
    payload = {
      notification: {
        title: title,
        body: body
      }
    };
  } else {
    payload = {
      notification: {
        title: title
      }
    };
  }

  var options = {
    priority: "high",
    timeToLive: 60 * 60 * 24
  };

  if (to == 'all') {
    admin.messaging().sendToTopic(to, payload, options)
      .then(function (response) {
        res.send(200, 'ok');
      })
      .catch(function (error) {
        res.send(200, 'failed');
      });
  } else {
    admin.messaging().sendToDevice(to, payload, options)
      .then(function (response) {
        res.send(200, 'ok');
      })
      .catch(function (error) {
        res.send(200, 'failed');
      });
  }
});
