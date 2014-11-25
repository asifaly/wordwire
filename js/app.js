/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', '$firebaseAuth', 'UserService', 'WordsService',
    function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter, $firebaseAuth, UserService, WordsService) {
        //initialize pattern if it is not done, when app initializes, there is an error for invalid pattern
        $scope.stats = {};
        $scope.stats.pattern = new RegExp();
        $scope.newword = {
            name: '',
            score: ''
        };
        $scope.user = {
            displayName: '',
            uid: '',
            avatar: ''
        };

        //defining firebase instances
        var sRef = new Firebase(FIREBASE_URI + "stats/"),
            uRef = new Firebase(FIREBASE_URI);

        $scope.authObj = $firebaseAuth(uRef);

        //logout user
        $scope.logout = function logout() {
            $scope.authObj.$unauth();
            Firebase.goOffline(); //go offline from firebase on logout to show only logged in online users
            $scope.user = {
                displayName: '',
                uid: ''
            };
        };

        //social login user
        $scope.login = function socialLogin(provider) {
            Firebase.goOnline();
            $scope.authObj.$authWithOAuthPopup(provider).then(function (authData) {
                UserService.addUser(authData).then(function (data) {
                    console.info("Login Complete");
                }).catch(function (error) {
                    console.error("Authentication failed:", error);
                });
            });
        };

        //onAuth update$scope.user
        $scope.authObj.$onAuth(function (authData) {
            if (authData) {
                //onlogin, presence will be updated to true i.e to show online users
                UserService.presence(authData).then(function (data) {
                    $scope.user = data;
                });
            } else {
                console.log("Logged out");
            }
        });

        //watch for change in value of lastWord, firstLetter and pattern and update the$scope using regular firebase
        sRef.on("value", function statsFbGet(statssnapshot) {
            $timeout(function statsscopeSet() {
                //get value of firebase/stats
                $scope.stats = statssnapshot.val();
                //using filter to convert string to regex
                $scope.stats.pattern = $filter('strtoregex')(statssnapshot.val().pattern);
            });
        });

        //load values of words, scores and connected users from firebase
        $scope.words = WordsService.getWords();
        $scope.onlineusers = UserService.getOnline();
        //$scope.stats = WordsService.getStats();

        //$scope function is called on clicking the submit button
        $scope.addWord = function wordsFbAdd() {
            //create variables to update stats
            $scope.isReadOnly = true;

            var lastWord = $filter('lowercase')($scope.newword.name),
                firstLetter = $filter('firstlet')(lastWord),
                pattern = $filter('regtostr')($scope.stats.pattern, firstLetter);

            WordsService.checkWord(lastWord).then(function (data) {
                WordsService.dictCheck(lastWord).then(function (data) {
                    for (var attrname in data) {
                        $scope.newword[attrname] = data[attrname];
                    }

                    WordsService.addWord(angular.copy($scope.newword)).then(function (nref) {
                        $window.alert("New Word added at " + nref);
                        $scope.isReadOnly = false;
                        $scope.newword = {
                            name: '',
                            score: ''
                        }; //clear the ng-model newword
                        $scope.myForm.$setPristine(true);
                    });

                    WordsService.setStats(lastWord, pattern, firstLetter).then(function (stref) {
                        console.info("stats added at " + stref);
                    });
                }).catch(function (error) {
                    $window.alert(error);
                });
            }).catch(function (error) {
                $window.alert(error);
                $scope.isReadOnly = false;
            });
        };

        //watch for changes to input field ng-model=newword.name and compute newword.score
        $scope.$watch("newword.name", function (newValue, oldValue) {
            $scope.newword.score = $filter('score')(newValue);
        });
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
