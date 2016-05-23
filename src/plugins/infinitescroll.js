(function(){
    'use strict';
    angular.module('gantt.infinitescroll', ['gantt', 'gantt.infinitescroll.templates']).directive('ganttInfinitescroll', [function() {
        return {
            restrict: 'E',
            require: '^gantt',
            scope: {
                enabled: '=?'
                // Add other option attributes for this plugin
            },
            link: function(scope, element, attrs, ganttCtrl) {
                var api = ganttCtrl.gantt.api;

                // Load options from global options attribute.
                if (scope.options && typeof(scope.options.infinitescroll) === 'object') {
                    for (var option in scope.options.infinitescroll) {
                        scope[option] = scope.options[option];
                    }
                }

                if (scope.enabled === undefined) {
                    scope.enabled = true;
                }

                api.directives.on.new(scope, function(dName, dScope, dElement, dAttrs, dController) {
                    // Write Template Hooks here...
                    console.log("here")
                });
            }
        };
    }]);
}());

