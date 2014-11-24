/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', '$firebaseAuth', 'wwService',
    function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter, $firebaseAuth, wwService) {
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
        var wRef = new Firebase(FIREBASE_URI + "words/"),
            wordRef = $firebase(wRef).$asArray(),
            sRef = new Firebase(FIREBASE_URI + "stats/"),
            uRef = new Firebase(FIREBASE_URI),
            statRef = $firebase(sRef), //can define $set only if it is not defined as Object or Array
            oRef = new Firebase(FIREBASE_URI + "presence/"),
            onlineRef = $firebase(oRef).$asArray();

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
                wwService.addUser(authData).then(function (data) {})
            }).catch(function (error) {
                console.error("Authentication failed:", error);
            });
        };

        //onAuth update$scope.user
        $scope.authObj.$onAuth(function (authData) {
            if (authData) {
                //onlogin, presence will be updated to true i.e to show online users
                wwService.presence(authData).then(function (data) {
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

        //load last 5 values of words and scores from firebase using angularfire
        wordRef.$loaded().then(function wordsscopeSet(wordlist) {
            //load data to words on promise
            $scope.words = wordlist;
        });

        onlineRef.$loaded().then(function onlinescopeSet(onlineList) {
            $scope.onlineusers = onlineList;
        });

        //$scope function is called on clicking the submit button
        $scope.addWord = function wordsFbAdd() {
            //create variables to update stats
            $scope.isReadOnly = true;

            var lastWord = $filter('lowercase')($scope.newword.name),
                firstLetter = $filter('firstlet')(lastWord),
                pattern = $filter('regtostr')($scope.stats.pattern, firstLetter);

            wRef.orderByChild("name").equalTo(lastWord).once("value", function checkExists(snapshot) {
                if (snapshot.val() !== null) { //if word exists in firebase
                    $window.alert("word already exists chose another");
                    $scope.isReadOnly = false;
                } else {
                    wwService.dictCheck(lastWord).then(function (data) {
                        if (data !== null) {
                            for (var attrname in data) {
                                $scope.newword[attrname] = data[attrname];
                            }
                            wordRef.$add(angular.copy($scope.newword)).then(function getNewWordKey(nref) {
                                var wid = nref.key();
                                $window.alert("newword added successfully");
                                $scope.isReadOnly = false;
                                console.log(wid);
                            });
                            $timeout(function statsFbSet() { //update lastWord, firstLetter and pattern to Firebase
                                statRef.$set({
                                    firstletter: firstLetter,
                                    lastword: lastWord,
                                    pattern: pattern
                                }).then(function stat$scopeSet() {
                                    //$scope.stats.pattern = $filter('strtoregex')(pattern);
                                    $scope.newword = {
                                        name: '',
                                        score: ''
                                    }; //clear the ng-model newword
                                    $scope.myForm.$setPristine(true);
                                });
                            });
                        } else {
                            $scope.isReadOnly = false;
                        }
                    }).finally(function () {
                        $scope.isReadOnly = false;
                    });
                }
            });
        };

        //watch for changes to input field ng-model=newword.name and compute newword.score
        $scope.$watch("newword.name", function (newValue, oldValue) {
            $scope.newword.score = $filter('score')(newValue);
        });
    }]);

wordWire.factory('wwService', ['$http', '$log', '$q', '$window', 'FIREBASE_URI', '$firebase',
        function ($http, $log, $q, $window, FIREBASE_URI, $firebase) {

        var deferred = $q.defer(),
            wRef = new Firebase(FIREBASE_URI + "words/"),
            uRef = new Firebase(FIREBASE_URI),
            usersRef = new Firebase(FIREBASE_URI + "users/"),
            amOnline = new Firebase(FIREBASE_URI + '.info/connected');

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
                            $window.alert("Word Not Found in Dictionary");
                            deferred.resolve(null);
                        }
                    }).error(function (msg, code) {
                        deferred.reject(msg);
                        $log.error(msg, code);
                    });
                return deferred.promise;
            },

            //once user is logged in set the user presence to online and on logout remove presence
            presence: function (authData) {
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
            }
        };
    }]);
