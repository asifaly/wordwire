/*jslint devel: true, maxerr: 50*/
/*global wordWire*/
/*global angular*/
/*global Firebase*/
'use strict';
wordWire.controller('LoginCtrl', ['$scope', '$firebase', '$window', 'FIREBASE_URI',
    function ($scope, $firebase, $window, FIREBASE_URI) {
        var uRef = new Firebase(FIREBASE_URI),
            usersRef = new Firebase(FIREBASE_URI + "users");

        $scope.user = {
            displayName: '',
            uid: '',
            provider: ''
        };

        $scope.logout = function userLogout() {
            uRef.unauth();
            $scope.user = {
                displayName: '',
                uid: '',
                provider: ''
            };
        };

        $scope.login = function socialLogin(provider) {
            uRef.authWithOAuthPopup(provider, function (err, authData) {});
        };

        $scope.email = function emlLogin() {
            var email = $scope.user.email,
                password = $scope.user.password;
            uRef.createUser({
                "email": email,
                "password": password
            }, function (error, authData) {
                if (error === null) {
                    console.log("User created successfully");
                    console.log(authData);
                } else {
                    console.log("Error creating user:", error);
                }
            });
        };

        uRef.onAuth(function onAuthen(authData) {
            if (authData) {
                setTimeout(function () {
                    $scope.$apply(function userScpSet() {
                        if (authData.provider === "google") {
                            $scope.user = {
                                displayName: authData.google.displayName,
                                uid: authData.uid,
                                provider: authData.provider
                            };
                        } else if (authData.provider === "facebook") {
                            $scope.user = {
                                displayName: authData.facebook.displayName,
                                uid: authData.uid,
                                provider: authData.provider
                            };
                        } else if (authData.provider === "twitter") {
                            $scope.user = {
                                displayName: authData.twitter.displayName,
                                uid: authData.uid,
                                provider: authData.provider
                            };
                        }
                    });
                }, 100);
                // user authenticated with Firebase
                usersRef.child(authData.uid).once('value', function userFbSet(snapshot) {
                    if (snapshot.val() !== null) {
                        //$window.alert("User Already Exists");
                        console.log(authData);
                        //console.log(authData.google.displayName);
                    } else {
                        uRef.child('users').child(authData.uid).set(authData);
                        console.log("New User" + "User ID: " + authData.uid + ", Provider: " + authData.provider + "created");
                        console.log(authData);
                        alert("Logged in Successfully");
                    }
                });
            } else {
                console.log("User Not Logged In");
            }
        });
    }]);
