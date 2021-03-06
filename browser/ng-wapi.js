var apiClient = require('./api-client');
var Dropzone = require('dropzone');
var querystring = require("querystring");

require('es6-promise').polyfill();

window.wapiClient = apiClient;

var _ = {
    defaults: require('lodash/defaults'),
    forIn: require('lodash/forIn')
};

if (!window.angular) {
    throw 'Angular is not present.\nInclude <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.5.8/angular.min.js"></script> before ng-wapi 😬';
}

try {
    if (angular.module('ngWapi')) {
        throw 'exists';
    }
} catch (err) {
    if (err == 'exists') {
        throw 'ngWapi is already present. Avoiding initialization ...';
    }
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function eraseCookie(name) {
    setCookie(name, "", -1);
}

angular.module('ngWapi', [])
    .run(['$rootScope', function ($rootScope) {
        $rootScope.wLocation = {
            path: location.pathname.split('/'),
            query: querystring.parse(location.search.slice(1))
        };
        $rootScope.accessToken = localStorage.getItem('access_token');

        $rootScope.logout = function (redirectTo) {
            localStorage.removeItem('access_token');
            eraseCookie('access_token');
            location.href = redirectTo;
        };
    }])
    .config(['$sceDelegateProvider', function ($sceDelegateProvider) {
        $sceDelegateProvider.resourceUrlWhitelist(['**']);
    }])
    .directive('wForm', function () {
        return {
            restrict: 'AE',
            scope: true,
            link: function (scope, el, attrs) {
                scope._dz = {};
                var fileEls = el[0].querySelectorAll('[file]');

                for (var elIdx=0; elIdx<fileEls.length; elIdx++) {
                    var el = fileEls[elIdx];

                    var name = el.getAttribute('name');
                    if (!name) {
                        throw ('name attribute is required in ' + el);
                    }

                    scope._dz[name] = new Dropzone(el, {
                        url: '/',
                        autoProcessQueue: false,
                        init: function () {
                            this.on('addedfile', function (file) {
                                if (this.files.length > 1) {
                                    this.removeFile(this.files[0]);
                                }
                            });
                        }
                    });
                }
            },
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                var formName = $attrs.wForm;
                var json = $attrs.json;

                $scope.submit = function (data) {
                    var files = {};
                    var body = data || $scope.data;
                    var promise;

                    _.forIn($scope._dz, function (dz, name) {
                        if (dz.files) {
                            files[name] = dz.files[0];
                        }
                    });

                    $scope.fail = false;
                    $scope.sending = true;
                    $scope.submitting = true;

                    promise = json ?
                        apiClient.jsonFetch(formName, {
                            body: body,
                            method: 'POST'
                        }) : apiClient.submitForm({
                            name: formName,
                            body: body,
                            files: files
                        });

                    promise.then(function (response) {
                        // 'submitted' means ok post
                        $scope.submitted = true;
                        $scope.success = true;
                        $scope.response = response;

                        if ($attrs.replaceEntireScope) {
                            $scope.data = response;
                        }

                        if ($attrs.loginForm) {
                            localStorage.setItem('access_token', response.token);
                            setCookie('access_token', response.token, 365);
                        }
                        if ($attrs.onResponseRedirect) {
                            $scope.redirecting = true;
                            var redirectTo = $scope.$eval($attrs.onResponseRedirect);
                            var delay = $attrs.redirectDelay ? parseInt($attrs.redirectDelay) : 0;

                            setTimeout(function () {
                                location.href = redirectTo;
                            }, delay);
                        } else {
                            $scope.sending = false;
                        }

                        $scope.$digest();
                    }).catch(function (e) {
                        $scope.sending = false;
                        $scope.fail = true;
                        $scope.$digest();
                    });
                };
            }]
        };
    })
    .directive('wGet', function () {
        return {
            restrict: 'AE',
            scope: true,
            controller: ['$scope', '$attrs', function ($scope, $attrs) {
                $scope.resourcePath = $scope.$eval($attrs.wGet);
                $scope.loading = true;

                apiClient.getResource({
                    resourcePath: $scope.resourcePath
                }).then(function (response) {
                    if ($attrs.dev) {
                        console.log(response);
                    }

                    $scope.loading = false;
                    $scope.data = response;

                    $scope.$digest();
                });
            }]
        };
    });
