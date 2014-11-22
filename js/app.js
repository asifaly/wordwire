/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
var wordWire = angular.module('wordWire', ['firebase', 'ngResource']);
wordWire.constant('FIREBASE_URI', 'https://wordwire.firebaseio.com/');
wordWire.controller('WordCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', '$firebaseAuth', '$http',
    function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter, $firebaseAuth, $http) {
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
            statRef = $firebase(sRef), //can define $set only if it is not defined as Object or Array
            uRef = new Firebase(FIREBASE_URI),
            amOnline = new Firebase(FIREBASE_URI + '.info/connected'),
            oRef = new Firebase(FIREBASE_URI + "presence/"),
            onlineRef = $firebase(oRef).$asArray(),
            usersRef = new Firebase(FIREBASE_URI + "users/");

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
            $scope.authObj.$authWithOAuthPopup(provider).then(function (authData) {
                Firebase.goOnline(); //go online on firebase when logged in
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
                    var presRef = new Firebase(FIREBASE_URI + 'presence/' + authData.uid),
                        pRef = $firebase(presRef);
                    if (snapshot.val()) {
                        presRef.onDisconnect().remove();
                        $scope.user.uid = authData.uid;
                        $scope.user.online = true;
                        if (authData.provider === 'google') {
                            $scope.user.displayName = authData.google.displayName;
                            $scope.user.avatar = authData.google.cachedUserProfile.picture;
                        } else if (authData.provider === 'facebook') {
                            $scope.user.displayName = authData.facebook.displayName;
                            $scope.user.avatar = authData.facebook.cachedUserProfile.picture.data.url;
                        } else if (authData.provider === 'twitter') {
                            $scope.user.displayName = authData.twitter.displayName;
                            $scope.user.avatar = authData.twitter.cachedUserProfile.profile_image_url_https;
                        }
                        pRef.$set($scope.user);
                    }
                });
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

        //load last 5 values of words and scores from firebase using angularfire
        wordRef.$loaded().then(function wordsScopeSet(wordlist) {
            //load data to words on promise
            $scope.words = wordlist;
        });

        onlineRef.$loaded().then(function onlineScopeSet(onlineList) {
            $scope.onlineusers = onlineList;
        });

        //this function is called on clicking the submit button
        $scope.addWord = function wordsFbAdd() {
            //create variables to update stats
            $scope.isReadOnly = true;

            var lastWord = $filter('lowercase')($scope.newword.name),
                firstLetter = $filter('firstlet')(lastWord),
                pattern = $filter('regtostr')($scope.stats.pattern, firstLetter),
                url = 'https://api.wordnik.com/v4/word.json/' + lastWord + '/definitions?limit=1&includeRelated=false&sourceDictionaries=webster%2Cwordnet&useCanonical=false&includeTags=false&api_key=9a67169ed9a424f1400000112af04acdc9cf96bea0fe263ed';

            wRef.orderByChild("name").equalTo(lastWord).once("value", function checkExists(snapshot) {
                if (snapshot.val() !== null) { //if word exists in firebase
                    $window.alert("word already exists chose another");
                } else {
                    $http.get(url).
                        success(function (data) {
                            if (data.length > 0) {
                                wordRef.$add(angular.copy($scope.newword)).then(function getNewWordKey(nref) {
                                    var wid = nref.key();
                                    $window.alert("newword added successfully");
                                    console.log(wid);
                                });
                                $timeout(function statsFbSet() { //update lastWord, firstLetter and pattern to Firebase
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
                            } else {
                                $window.alert("Dictionary says that's Gibberish! Not english");
                            }
                        }).error(function (status) {
                            console.error("error " + status);
                        });
                }
            });
        };

        //watch for changes to input field ng-model=newword.name and compute newword.score
        $scope.$watch("newword.name", function (newValue, oldValue) {
            $scope.newword.score = $filter('score')(newValue);
        });
    }]);
