/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
wordWire.factory('Auth', ['$firebaseAuth', 'FIREBASE_URI', function($firebaseAuth, FIREBASE_URI) {
    var uRef = new Firebase(FIREBASE_URI);
    return $firebaseAuth(uRef);
}]);

wordWire.factory('UserService', ['$log', '$q', 'FIREBASE_URI', '$firebase',
        function ($log, $q, FIREBASE_URI, $firebase) {

        var uRef = new Firebase(FIREBASE_URI),
            usersRef = new Firebase(FIREBASE_URI + "users/"),
            amOnline = new Firebase(FIREBASE_URI + '.info/connected'),
            oRef = new Firebase(FIREBASE_URI + "presence/"),
            onlineRef = $firebase(oRef).$asArray();

        return {
            //once user is logged in set the user presence to online and on logout remove presence
            presence: function (authData) {
                var deferred = $q.defer();
                amOnline.on('value', function (snapshot) {
                    var presRef = new Firebase(FIREBASE_URI + 'presence/' + authData.uid),
                        user = {},
                        pRef = $firebase(presRef);
                    if (snapshot.val()) {
                        presRef.onDisconnect().remove();
                        if (authData.provider === 'google') {
                            user.displayName = authData.google.displayName;
                            user.avatar = authData.google.cachedUserProfile.picture;
                        } else if (authData.provider === 'facebook') {
                            user.displayName = authData.facebook.displayName;
                            user.avatar = authData.facebook.cachedUserProfile.picture.data.url;
                        } else if (authData.provider === 'twitter') {
                            user.displayName = authData.twitter.displayName;
                            user.avatar = authData.twitter.cachedUserProfile.profile_image_url_https;
                        }
                        user.uid = authData.uid;
                        user.online = true;
                        deferred.resolve(user);
                        pRef.$set(user);
                    }
                });
                return deferred.promise;
            },

            //add user if it does not exist in Firebase
            addUser: function (authData) {
                var deferred = $q.defer();
                usersRef.child(authData.uid).once('value', function (snapshot) {
                    if (snapshot.val() !== null) {
                        $log.info("User Already Exists");
                    } else {
                        uRef.child('users').child(authData.uid).set(authData);
                        $log.info("New User" + "User ID: " + authData.uid + " created");
                    }
                });
                $log.info("Authentication Successful");
                return deferred.promise;
            },

            getOnline: function () {
                return onlineRef;
            }
        };
    }]);

wordWire.factory('WordsService', ['$http', '$log', '$q', '$window', 'FIREBASE_URI', '$firebase', '$filter',
        function ($http, $log, $q, $window, FIREBASE_URI, $firebase, $filter) {

        var wRef = new Firebase(FIREBASE_URI + "words/"),
            wordRef = $firebase(wRef).$asArray(),
            sRef = new Firebase(FIREBASE_URI + "stats/"),
            statRef = $firebase(sRef);

        return {
            //check the word added exists in Firebase and if it is a valid word in dictionary
            dictCheck: function (lastWord) {
                var deferred = $q.defer(),
                    url = 'https://api.wordnik.com/v4/word.json/' + lastWord + '/definitions?limit=1&includeRelated=false&sourceDictionaries=webster%2Cwordnet&useCanonical=false&includeTags=false&api_key=9a67169ed9a424f1400000112af04acdc9cf96bea0fe263ed';
                $http.get(url)
                    .success(function (data) {
                        if (data.length > 0) {
                            deferred.resolve({
                                name: data[0].word,
                                definition: data[0].text,
                                pos: data[0].partOfSpeech,
                                attr: data[0].attributionText,
                                source: data[0].sourceDictionary
                            });
                        } else {
                            deferred.reject(new Error("Word Not Found in Dictionary"));
                        }
                    }).error(function (msg, code) {
                        deferred.reject(msg);
                        $log.error(msg, code);
                    });
                return deferred.promise;
            },

            getWords: function () {
                return wordRef;
            },

            /*            getStats: function () {
                statRef.pattern = $filter('strtoregex')(statRef.pattern);
                $log.info(statRef);
                $log.info(statRef.pattern);
                return statRef;
            },*/

            addWord: function (word) {
                var deferred = $q.defer();
                wordRef.$add(word).then(function (nref) {
                    $log.info(nref.key());
                    deferred.resolve(nref.key());
                });
                return deferred.promise;
            },

            checkWord: function (word) {
                var deferred = $q.defer();
                wRef.orderByChild("name").equalTo(word).once("value", function (snapshot) {
                    if (snapshot.val() !== null) { //if word exists in firebase
                        deferred.reject(new Error("Word already exists chose another"));
                    } else {
                        deferred.resolve();
                    }
                });
                return deferred.promise;
            },

            setStats: function (lastWord, pattern, firstLetter) {
                var deferred = $q.defer();
                statRef.$set({
                    firstletter: firstLetter,
                    lastword: lastWord,
                    pattern: pattern
                }).then(function (stref) {
                    deferred.resolve(stref.key());
                }).catch(function (error) {
                    deferred.reject(new Error("Stats Could not be updated"));
                });
                return deferred.promise;
            }
        };
    }]);
