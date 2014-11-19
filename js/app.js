/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
var wordWire = angular.module('wordWire', ['firebase']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', '$firebaseAuth',
    function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter, $firebaseAuth) {
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
            wordRef = $firebase(wRef.limitToLast(5)).$asArray(),
            sRef = new Firebase(FIREBASE_URI + "stats/"),
            statRef = $firebase(sRef), //can define $set only if it is not defined as Object or Array
            mainRef = new Firebase(FIREBASE_URI),
            uRef = new Firebase(FIREBASE_URI),
            amOnline = new Firebase(FIREBASE_URI + '.info/connected'),
            usersRef = new Firebase(FIREBASE_URI + "users/");

        $scope.authObj = $firebaseAuth(mainRef);

        //logout user
        $scope.logout = function logout() {
            $scope.authObj.$unauth();
            Firebase.goOffline();//go offline from firebase on logout to show only logged in online users
            $scope.user = {
                displayName: '',
                uid: ''
            };
        };

        //social login user
        $scope.login = function socialLogin(provider) {
            $scope.authObj.$authWithOAuthPopup(provider).then(function (authData) {
                Firebase.goOnline();//go online on firebase when logged in
                usersRef.child(authData.uid).once('value', function userFbSet(snapshot) {
                    if (snapshot.val() !== null) {
                        console.log("User Already Exists");
                    } else {
                        uRef.child('users').child(authData.uid).set(authData);
                        console.log("New User" + "User ID: " + authData.uid + " created");
                    }
                });
                console.log("Authentication Successful");
            }).catch(function (error) {
                console.error("Authentication failed:", error);
            });
        };

        //onAuth update scope.user
        $scope.authObj.$onAuth(function (authData) {
            if (authData) {
                //onlogin, presence will be updated to true i.e to show online users
                amOnline.on('value', function (snapshot) {
                    var presRef = new Firebase(FIREBASE_URI + 'presence/' + authData.uid);
                    if (snapshot.val()) {
                        presRef.onDisconnect().remove();
                        presRef.set(true);
                    }
                });
                if (authData.provider === 'google') {
                    $scope.user = {
                        displayName: authData.google.displayName,
                        uid: authData.uid,
                        avatar: authData.google.cachedUserProfile.picture
                    };
                } else if (authData.provider === 'facebook') {
                    $scope.user = {
                        displayName: authData.facebook.displayName,
                        uid: authData.uid,
                        avatar: authData.facebook.cachedUserProfile.picture.data.url
                    };
                } else if (authData.provider === 'twitter') {
                    $scope.user = {
                        displayName: authData.twitter.displayName,
                        uid: authData.uid,
                        avatar: authData.twitter.cachedUserProfile.profile_image_url_https
                    };
                }
            } else {
                console.log("Logged out");
            }
        });

        //watch for change in value of lastWord, firstLetter and pattern and update the scope using regular firebase
        sRef.on("value", function statsFbGet(statssnapshot) {
            $timeout(function statsScopeSet() {
                //get value of firebase/stats
                $scope.stats = statssnapshot.val();
                //using filter to convert string to regex
                $scope.stats.pattern = $filter('strtoregex')(statssnapshot.val().pattern);
            });
        });

        // Write a string when this client loses connection - for test purposes
        //presenceRef.onDisconnect().set("I disconnected!");

        //load last 5 values of words and scores from firebase using angularfire
        wordRef.$loaded().then(function wordsScopeSet(wordlist) {
            //load data to words on promise
            $scope.words = wordlist;
        });

        //this function is called on clicking the submit button
        $scope.addWord = function wordsFbAdd() {
            //create variables to update stats
            var lastWord = $scope.newword.name,
                firstLetter = $filter('firstlet')(lastWord),
                pattern = $filter('regtostr')($scope.stats.pattern, firstLetter),
                //create variables for dictionary check
                dictCheck = $filter('uppercase')(lastWord),
                firstTwo = $filter('uppercase')(lastWord.substr(0, 2)),
                dRef = FIREBASE_URI + "dictionary/" + firstTwo,
                //create new firebase instance, based on first 2 chars of new word
                dictRef = new Firebase(dRef);

            //check if the word entered is a valid english word using regular firebase
            dictRef.orderByKey().startAt(dictCheck).endAt(dictCheck).on("value", function checkDict(snapshot) {
                //if the word exists in the dictionary, i.e not equal to null
                if (snapshot.val() !== null) {
                    //check if the word already exists in firebase using regualr firebase
                    wRef.orderByChild("name").equalTo(lastWord).once("value", function checkExists(snapshot) {
                        if (snapshot.val() !== null) { //if word exists in firebase
                            $window.alert("word already exists chose another");
                        } else { //if does not exist in firebase, add it using angularfire
                            wordRef.$add(angular.copy($scope.newword)).then(function getNewWordKey(nref) {
                                var wid = nref.key();
                                console.log("newword added successfully" + wid);
                            });
                            $timeout(function statsFbSet() { //update lastWord, firstLetter and pattern based on newword using angularfire
                                statRef.$set({
                                    firstletter: firstLetter,
                                    lastword: lastWord,
                                    pattern: pattern
                                }).then(function statsScopeSet() {
                                    //$scope.stats.pattern = $filter('strtoregex')(pattern);
                                    $scope.newword = {
                                        name: '',
                                        score: ''
                                    }; //clear the ng-model newword

                                    $scope.myForm.$setPristine(true);
                                });
                            });
                        }
                    }, function (err) {
                        $window.alert("snap! its my fault..try again please.");
                    });
                } else {
                    $window.alert("word does not exist in my dictionary");
                }
            });
        };

        //watch for changes to input field ng-model=newword.name and compute newword.score
        $scope.$watch("newword.name", function (newValue, oldValue) {
            $scope.newword.score = $filter('score')(newValue);
        });
    }]);
