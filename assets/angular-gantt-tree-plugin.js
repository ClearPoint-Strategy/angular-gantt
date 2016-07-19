/*
Project: angular-gantt v1.2.13 - Gantt chart component for AngularJS
Authors: Marco Schweighauser, Rémi Alvergnat
License: MIT
Homepage: https://www.angular-gantt.com
Github: https://github.com/angular-gantt/angular-gantt.git
*/
(function(){
    'use strict';
    angular.module('gantt.tree', ['gantt', 'gantt.tree.templates', 'ui.tree']).directive('ganttTree', ['ganttUtils', '$compile', '$document', function(utils, $compile, $document) {
        // Provides the row sort functionality to any Gantt row
        // Uses the sortableState to share the current row

        return {
            restrict: 'E',
            require: '^gantt',
            scope: {
                enabled: '=?',
                header: '=?',
                content: '=?',
                headerContent: '=?',
                keepAncestorOnFilterRow: '=?'
            },
            link: function(scope, element, attrs, ganttCtrl) {
                var api = ganttCtrl.gantt.api;

                // Load options from global options attribute.
                if (scope.options && typeof(scope.options.sortable) === 'object') {
                    for (var option in scope.options.sortable) {
                        scope[option] = scope.options[option];
                    }
                }

                if (scope.enabled === undefined) {
                    scope.enabled = true;
                }

                if (scope.header === undefined) {
                    scope.header = 'Name';
                }

                if (scope.headerContent === undefined) {
                    scope.headerContent = '{{getHeader()}}';
                }

                if (scope.keepAncestorOnFilterRow === undefined) {
                    scope.keepAncestorOnFilterRow = false;
                }

                api.directives.on.new(scope, function(directiveName, sideContentScope, sideContentElement) {
                    if (directiveName === 'ganttSideContent') {
                        var labelsScope = sideContentScope.$new();
                        labelsScope.pluginScope = scope;

                        var ifElement = $document[0].createElement('div');
                        angular.element(ifElement).attr('data-ng-if', 'pluginScope.enabled');
                        angular.element(ifElement).addClass('side-element');

                        var labelsElement = $document[0].createElement('gantt-side-content-tree');
                        angular.element(ifElement).append(labelsElement);

                        sideContentElement.append($compile(ifElement)(labelsScope));
                    }
                });
            }
        };
    }]);
}());


(function(){
    'use strict';
    angular.module('gantt.tree').directive('ganttRowTreeLabel', ['GanttDirectiveBuilder', function(Builder) {
        var builder = new Builder('ganttRowTreeLabel');
        builder.restrict = 'A';
        builder.templateUrl = undefined;
        return builder.build();
    }]);
}());


(function(){
    'use strict';
    angular.module('gantt.tree').directive('ganttSideContentTree', ['GanttDirectiveBuilder', function(Builder) {
        var builder = new Builder('ganttSideContentTree', 'plugins/tree/sideContentTree.tmpl.html');
        return builder.build();
    }]);
}());


(function() {
    'use strict';
    angular.module('gantt.tree').controller('GanttTreeController', ['$scope', '$filter', 'GanttHierarchy', function($scope, $filter, Hierarchy) {
        $scope.rootRows = [];
        $scope.collapsedParents = [];

        $scope.getHeader = function() {
            return $scope.pluginScope.header;
        };

        var hierarchy = new Hierarchy();

        $scope.pluginScope.$watchGroup(['keepAncestorOnFilterRow', 'enabled'], function(value) {
            var keepAncestor = value[0] && value[1];

            if (keepAncestor) {
                var filterImpl = function(sortedRows, filterRow, filterRowComparator) {
                    hierarchy.refresh(sortedRows);

                    var leaves = [];
                    for (var i = 0; i < sortedRows.length; i++) {
                        var children = hierarchy.children(sortedRows[i]);
                        if (!children || children.length === 0) {
                            leaves.push(sortedRows[i]);
                        }
                    }

                    var filteredLeaves = $filter('filter')(leaves, filterRow, filterRowComparator);

                    var filterRowKeepAncestor = function(row) {
                        if (filteredLeaves.indexOf(row) > -1) {
                            return true;
                        }

                        var descendants = hierarchy.descendants(row);

                        for (var i = 0; i < descendants.length; i++) {
                            if (filteredLeaves.indexOf(descendants[i]) > -1) {
                                return true;
                            }
                        }

                        return false;
                    };

                    return $filter('filter')(sortedRows, filterRowKeepAncestor, filterRowComparator);
                };
                $scope.gantt.rowsManager.setFilterImpl(filterImpl);
            } else {
                $scope.gantt.rowsManager.setFilterImpl(false);
            }
        });

        var isVisible = function(row) {
            var parentRow = $scope.parent(row);
            while (parentRow !== undefined) {
                if (parentRow !== undefined && parentRow._collapsed) {
                    return false;
                }
                parentRow = $scope.parent(parentRow);
            }

            //quickly make sure this wasnt a previously closed parent
            if($scope.collapsedParents.indexOf(row.model.parent) != -1){
                return false;
            }

            //no parent in visible dataset, and our immediate parent wasnt collapsed.
            //look up ancestry of parents to find which was collapsed.
            if(row.model.parent != undefined) {
                parentRow = $filter('filter')($scope.gantt.rowsManager.filteredRows, function (currentrow, index, array) { return currentrow.model.id === row.model.parent })[0];
                while (parentRow !== undefined) {
                    if (parentRow !== undefined && $scope.collapsedParents.indexOf(parentRow.model.id) != -1) {
                        return false;
                    }
                    parentRow = $filter('filter')($scope.gantt.rowsManager.filteredRows, function (currentrow, index, array) { return currentrow.model.id === parentRow.model.parent })[0];
                }
            }

            return true;
        };

        var filterRowsFunction = function(rows) {
            return rows.filter(function(row) {
                return isVisible(row);
            });
        };

        var sortRowsFunction = function(rows) {
            var sortedRows = [];
            var rootRows = [];

            var hasParent = false;

            for (var i=0; i<rows.length; i++) {
                var rowParent = $scope.parent(rows[i]);
                if (rowParent === undefined) {
                    rootRows.push(rows[i]);
                } else {
                    hasParent = true;
                }
            }

            var handleChildren = function(row) {
                sortedRows.push(row);
                var children = $scope.children(row);


                if (children !== undefined && children.length > 0) {
                    var sortedChildren = children.sort(function(a, b) {
                        return rows.indexOf(a) - rows.indexOf(b);
                    });

                    for (var i=0;i<sortedChildren.length;i++) {
                        handleChildren(sortedChildren[i]);
                    }
                }
            };

            for (i=0; i<rootRows.length; i++) {
                handleChildren(rootRows[i]);
            }

            return sortedRows;
        };
        $scope.gantt.api.rows.addRowSorter(sortRowsFunction);
        $scope.gantt.api.rows.addRowFilter(filterRowsFunction);

        $scope.$on('$destroy', function() {
            $scope.gantt.api.rows.removeRowSorter(sortRowsFunction);
            $scope.gantt.api.rows.removeRowFilter(filterRowsFunction);
        });

        var refresh = function() {
            $scope.rootRows = hierarchy.refresh($scope.gantt.rowsManager.visibleRows);

            if ($scope.gantt.rowsManager.visibleRows.length > 0) {
                $scope.gantt.api.rows.sort();
                $scope.gantt.api.rows.refresh();
            }
        };

        // $scope.gantt.api.rows.on.remove($scope, refresh);
        // $scope.gantt.api.rows.on.add($scope, refresh);

        var isRowCollapsed = function(rowId) {
            var row;
            if (typeof rowId === 'string') {
                row = $scope.gantt.rowsManager.rowsMap[rowId];
            } else {
                row = rowId;
            }
            if (row === undefined) {
                return undefined;
            }
            if (row._collapsed === undefined) {
                return false;
            }
            return row._collapsed;
        };

        var expandRow = function(rowId) {
            var row;
            if (typeof rowId === 'string') {
                row = $scope.gantt.rowsManager.rowsMap[rowId];
            } else {
                row = rowId;
            }
            if (row === undefined) {
                return;
            }

            var rowScope = $scope.nodeScopes[row.model.id];
            if (rowScope.collapsed) {
                rowScope.toggle();
            }
        };

        var collapseRow = function(rowId) {
            var row;
            if (typeof rowId === 'string') {
                row = $scope.gantt.rowsManager.rowsMap[rowId];
            } else {
                row = rowId;
            }
            if (row === undefined) {
                return;
            }

            var rowScope = $scope.nodeScopes[row.model.id];
            if (!rowScope.collapsed) {
                rowScope.toggle();
            }
        };

        var getHierarchy = function() {
            return hierarchy;
        };

        $scope.getHeaderContent = function() {
            return $scope.pluginScope.headerContent;
        };

        $scope.gantt.api.registerMethod('tree', 'refresh', refresh, this);
        $scope.gantt.api.registerMethod('tree', 'isCollapsed', isRowCollapsed, this);
        $scope.gantt.api.registerMethod('tree', 'expand', expandRow, this);
        $scope.gantt.api.registerMethod('tree', 'collapse', collapseRow, this);

        $scope.gantt.api.registerEvent('tree', 'collapsed');

        $scope.gantt.api.registerMethod('tree', 'getHierarchy', getHierarchy, this);

        $scope.$watchCollection('gantt.rowsManager.visibleRows', function() {
            $scope.rootRows = hierarchy.refresh($scope.gantt.rowsManager.visibleRows);
        });

        $scope.children = function(row) {
            if (row === undefined) {
                return $scope.rootRows;
            }
            return hierarchy.children(row);
        };

        $scope.parent = function(row) {
            return hierarchy.parent(row);
        };

        $scope.nodeScopes = {};

        $scope.$on('ganttCollapseAll', function(event, args){
            console.log($scope.gantt.rowsManager.visibleRows)
            angular.forEach($scope.gantt.rowsManager.visibleRows, function(row, index){
                var kids = $scope.children(row);
                if(kids && kids.length > 0){
                    var isCurrentlyCollapsed = row._collapsed;
                    if(isCurrentlyCollapsed){
                        $scope.gantt.api.tree.expand(row.model.id)
                        row._collapsed = false;
                        if($scope.gantt.options.value('infiniteScroll')) {
                            var previouslyCollapsedIdx = $scope.collapsedParents.indexOf(row.model.id);
                            if (previouslyCollapsedIdx != -1) {
                                $scope.collapsedParents.splice(previouslyCollapsedIdx, 1);
                            }
                        }

                    } else {
                        $scope.gantt.api.tree.collapse(row.model.id)
                        row._collapsed = true;
                        if($scope.gantt.options.value('infiniteScroll')) {
                            $scope.collapsedParents.push(row.model.id);
                        }
                    }
                }
                // $scope.gantt.api.rows.refresh();
            });
        });

        $scope.toggleRowCollapse = function(row){
            var isCurrentlyCollapsed = row._collapsed;
            if(isCurrentlyCollapsed){
                this.gantt.api.tree.expand(row.model.id)
                row._collapsed = false;
                if($scope.gantt.options.value('infiniteScroll')) {
                    var previouslyCollapsedIdx = $scope.collapsedParents.indexOf(row.model.id);
                    if (previouslyCollapsedIdx != -1) {
                        $scope.collapsedParents.splice(previouslyCollapsedIdx, 1);
                    }
                }

            } else {
                this.gantt.api.tree.collapse(row.model.id)
                row._collapsed = true;
                if($scope.gantt.options.value('infiniteScroll')) {
                    $scope.collapsedParents.push(row.model.id);
                }
            }
            $scope.gantt.api.tree.raise.collapsed($scope, row, row._collapsed);
            $scope.gantt.api.rows.rowCollapsed();
            $scope.gantt.api.rows.refresh();
        }

    }]).controller('GanttUiTreeController', ['$scope', function($scope) {
        var collapseAll = function() {
            $scope.$broadcast('angular-ui-tree:collapse-all');
        };

        var expandAll = function() {
            $scope.$broadcast('angular-ui-tree:expand-all');
        };

        $scope.gantt.api.registerMethod('tree', 'collapseAll', collapseAll, $scope);
        $scope.gantt.api.registerMethod('tree', 'expandAll', expandAll, $scope);
    }]).controller('GanttTreeNodeController', ['$scope', function($scope) {
        $scope.$parent.nodeScopes[$scope.row.model.id] = $scope;
        $scope.$on('$destroy', function() {
            delete $scope.$parent.nodeScopes[$scope.row.model.id];
        });

        $scope.$watch('children(row)', function(newValue) {
            if (newValue) {
                // Children rows may have been filtered out
                // So we need to filter the raw hierarchy before displaying children in tree.
                var visibleRows = $scope.row.rowsManager.visibleRows;  //filteredRows

                var filteredChildrenRows = [];
                for (var i = 0; i < newValue.length; i++) {
                    var childRow = newValue[i];
                    if (visibleRows.indexOf(childRow) > -1) {
                        filteredChildrenRows.push(childRow);
                    }
                }
                $scope.$parent.childrenRows = filteredChildrenRows;
            } else {
                $scope.$parent.childrenRows = newValue;
            }
        });

        $scope.isCollapseDisabled = function() {
            if($scope.gantt.options.value('infiniteScroll')) {
                if ($scope.collapsedParents.indexOf($scope.$modelValue.model.id) != -1) {
                    return false;
                }
            }
            return !$scope.$parent.childrenRows || $scope.$parent.childrenRows.length === 0;
        };

        $scope.getValue = function() {
            return $scope.row.model.name;
        };

        $scope.getRowContent = function() {
            if ($scope.row.model.content !== undefined) {
                return $scope.row.model.content;
            }
            if ($scope.pluginScope.content !== undefined) {
                return $scope.pluginScope.content;
            }

            var content = $scope.row.rowsManager.gantt.options.value('rowContent');
            if (content === undefined) {
                content = '{{row.model.name}}';
            }
            return content;
        };
    }]);
}());


(function(){
    'use strict';
    angular.module('gantt.tree').directive('ganttTreeBody', ['GanttDirectiveBuilder', 'ganttLayout', function(Builder, layout) {
        var builder = new Builder('ganttTreeBody', 'plugins/tree/treeBody.tmpl.html');
        builder.controller = function($scope) {
            var hScrollBarHeight = layout.getScrollBarHeight();

            $scope.getLabelsCss = function() {
                var css = {};

                if ($scope.maxHeight) {
                    var bodyScrollBarHeight = $scope.gantt.scroll.isHScrollbarVisible() ? hScrollBarHeight : 0;
                    css['max-height'] = $scope.maxHeight - bodyScrollBarHeight - $scope.gantt.header.getHeight() + 'px';
                }

                return css;
            };
        };
        return builder.build();
    }]);
}());



(function(){
    'use strict';
    angular.module('gantt.tree').directive('ganttTreeHeader', ['GanttDirectiveBuilder', function(Builder) {
        var builder = new Builder('ganttTreeHeader', 'plugins/tree/treeHeader.tmpl.html');
        return builder.build();
    }]);
}());


angular.module('gantt.tree.templates', []).run(['$templateCache', function($templateCache) {
    $templateCache.put('plugins/tree/sideContentTree.tmpl.html',
        '<div class="gantt-side-content-tree" ng-controller="GanttTreeController">\n' +
        '    <gantt-tree-header>\n' +
        '    </gantt-tree-header>\n' +
        '    <gantt-tree-body>\n' +
        '    </gantt-tree-body>\n' +
        '</div>\n' +
        '');
    $templateCache.put('plugins/tree/treeBody.tmpl.html',
        '<div class="gantt-tree-body" ng-style="getLabelsCss()">\n' +
        '    <div gantt-vertical-scroll-receiver>\n' +
        '        <div class="gantt-row-label-background">\n' +
        '            <div class="toppaddingrow" style="height: 0px"></div>\n' +
        '            <div class="gantt-row-label gantt-row-height"\n' +
        '                 ng-repeat="row in gantt.rowsManager.visibleRows track by row.model.id">\n' +
        '                &nbsp;\n' +
        '            </div>\n' +
        '            <div class="bottompaddingrow" ng-style-attr="height: {{gantt.scroll.getScrollHeight() - (gantt.rowsManager.visibleRows.length * gantt.rowsManager.getRowHeight())}}px"></div>\n' +
        '        </div>\n' +
        '        <div ui-tree ng-controller="GanttUiTreeController" data-drag-enabled="false" data-empty-place-holder-enabled="false">\n' +
        '            <ol class="gantt-tree-root" ui-tree-nodes ng-model="rootRows">\n' +
        '                <li class="toppaddingrow" style="height: 0px"></li>\n' +
        '                <li ng-repeat="row in rootRows" ui-tree-node\n' +
        '                    ng-include="\'plugins/tree/treeBodyChildren.tmpl.html\'">\n' +
        '                </li>\n' +
        '                <li class="bottompaddingrow" ng-style-attr="height: {{gantt.scroll.getScrollHeight() - (gantt.rowsManager.visibleRows.length * gantt.rowsManager.getRowHeight())}}px"></li>\n' +
        '            </ol>\n' +
        '        </div>\n' +
        '\n' +
        '    </div>\n' +
        '</div>\n' +
        '');
    $templateCache.put('plugins/tree/treeBodyChildren.tmpl.html',
        '<div ng-controller="GanttTreeNodeController"\n' +
        '     class="gantt-row-label gantt-row-height">\n' +
        '    <div class="gantt-valign-container">\n' +
        '        <div class="gantt-valign-content">\n' +
        '            <a ng-disabled="isCollapseDisabled()" data-nodrag\n' +
        '               class="gantt-tree-handle-button btn btn-xs"\n' +
        '               ng-class="{\'gantt-tree-collapsed\': collapsed, \'gantt-tree-expanded\': !collapsed}"\n' +
        '               ng-click="toggleRowCollapse(row)"><span\n' +
        '                class="gantt-tree-handle glyphicon glyphicon-chevron-down"\n' +
        '                ng-class="{\n' +
        '                \'glyphicon-chevron-right\': collapsed, \'glyphicon-chevron-down\': !collapsed,\n' +
        '                \'gantt-tree-collapsed\': collapsed, \'gantt-tree-expanded\': !collapsed}"></span>\n' +
        '            </a>\n' +
        '            <span gantt-row-label class="gantt-label-text">{{row.model.content.indexOf(\'{\') != -1 ? row.model.name : row.model.content}}</span>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '</div>\n' +
        '<ol ui-tree-nodes ng-class="{hidden: collapsed}" ng-model="childrenRows">\n' +
        '    <li ng-repeat="row in childrenRows" ui-tree-node>\n' +
        '        <div ng-include="\'plugins/tree/treeBodyChildren.tmpl.html\'"></div>\n' +
        '    </li>\n' +
        '</ol>\n' +
        '');
    $templateCache.put('plugins/tree/treeHeader.tmpl.html',
        '<div class="gantt-tree-header" ng-style="{height: $parent.ganttHeaderHeight + \'px\'}">\n' +
        '    <div ng-if="$parent.ganttHeaderHeight" class="gantt-row-label gantt-row-label-header gantt-tree-row gantt-tree-header-row"><span class="gantt-label-text" gantt-bind-compile-html="getHeaderContent()"/></div>\n' +
        '</div>\n' +
        '');
}]);

//# sourceMappingURL=angular-gantt-tree-plugin.js.map