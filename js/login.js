wordWire.controller('LoginCtrl', ['$scope', '$firebase', 'FIREBASE_URI', '$timeout', '$window', '$filter', function ($scope, $firebase, FIREBASE_URI, $timeout, $window, $filter) {
    var uRef = new Firebase(FIREBASE_URI),
        usersRef = new Firebase(FIREBASE_URI + "users");

    $scope.user = {
        displayName: '',
        uid: ''
    };

    function logout() {
        uRef.unauth();
        $scope.user = {
            displayName: '',
            uid: ''
        };
    }

    function so_google() {
        uRef.authWithOAuthPopup("google", function (err, authData) {
            $scope.user.displayName = authData.google.displayName;
            $scope.user.uid = authData.uid;
        });
    }

    function so_fb() {
        uRef.authWithOAuthPopup("facebook", function (err, authData) {
            $scope.user.displayName = authData.facebook.displayName;
            $scope.user.uid = authData.uid;
        });
    }

    function so_twitter() {
        uRef.authWithOAuthPopup("twitter", function (err, authData) {
            $scope.user.displayName = authData.twitter.displayName;
            $scope.user.uid = authData.uid;
        });
    }

    function so_passwd() {
        var email = $scope.user.email,
            password = $scope.user.password;
        uRef.createUser({
            "email": email,
            "password": password
        }, function (error) {
            if (error === null) {
                console.log("User created successfully");
                console.log(authData);
            } else {
                console.log("Error creating user:", error);
            }
        });
    }

    uRef.onAuth(function (authData) {
        if (authData) {
            // user authenticated with Firebase
            usersRef.child(authData.uid).once('value', function (snapshot) {
                if (snapshot.val() !== null) {
                    $window.alert("User Already Exists");
                    console.log(authData);
                }
                else {
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