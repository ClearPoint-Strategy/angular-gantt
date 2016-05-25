(function(){
    'use strict';
    angular.module('gantt').directive('ganttScrollable', ['GanttDirectiveBuilder', '$timeout', 'ganttDebounce', 'moment', function(Builder, $timeout, debounce, moment) {
        var builder = new Builder('ganttScrollable');
        builder.controller = function($scope, $element) {
            $scope.gantt.scroll.$element = $element;
            var lastScrollLeft;
            var autoExpandTimer;
            var currentRowOffset;

            var autoExpandColumns = function(el, date, direction) {
                var autoExpand = $scope.gantt.options.value('autoExpand');
                if (autoExpand !== 'both' && autoExpand !== true && autoExpand !== direction) {
                    return;
                }

                var from, to;

                var viewScale = $scope.gantt.options.value('viewScale');
                viewScale = viewScale.trim();
                if (viewScale.charAt(viewScale.length - 1) === 's') {
                    viewScale = viewScale.substring(0, viewScale.length - 1);
                }
                var viewScaleValue;
                var viewScaleUnit;
                var splittedViewScale;

                if (viewScale) {
                    splittedViewScale = viewScale.split(' ');
                }
                if (splittedViewScale && splittedViewScale.length > 1) {
                    viewScaleValue = parseFloat(splittedViewScale[0]);
                    viewScaleUnit = splittedViewScale[splittedViewScale.length - 1];
                } else {
                    viewScaleValue = 1;
                    viewScaleUnit = viewScale;
                }

                if (direction === 'left') {
                    from = moment(date).add(-5 * viewScaleValue, viewScaleUnit);
                    $scope.fromDate = from;
                } else {
                    to = moment(date).add(5 * viewScaleValue, viewScaleUnit);
                    $scope.toDate = to;
                }

                $scope.gantt.api.scroll.raise.scroll(el.scrollLeft, date, direction);
            };

            $element.bind('scroll', debounce(function() {
                var el = $element[0];
                var currentScrollLeft = el.scrollLeft;
                var currentScrollTop = el.scrollTop;
                var direction;
                var date;

                $scope.gantt.scroll.cachedScrollLeft = currentScrollLeft;
                $scope.gantt.scroll.cachedScrollTop = currentScrollTop;
                $scope.gantt.columnsManager.updateVisibleColumns();

                if($scope.gantt.options.value('infiniteScroll')) {
                    var buffer = $scope.gantt.scroll.getScrollBuffer();
                    var rowHeight = $scope.gantt.rowsManager.getRowHeight();
                    var offset = Math.floor(Math.min($scope.gantt.scroll.getScrollTop(), $scope.gantt.scroll.getScrollHeight()) / rowHeight)

                    if (currentRowOffset !== offset) {
                        $scope.gantt.rowsManager.updateVisibleObjects();
                    }

                    var numRequiredParents = $scope.gantt.rowsManager.visibleRows.length - buffer;
                    if (numRequiredParents <= 0) {
                        numRequiredParents = 0;
                    }

                    var newHeight = (offset - numRequiredParents) * rowHeight;
                    if (newHeight + ($scope.gantt.rowsManager.visibleRows.length * rowHeight) <= $scope.gantt.scroll.getScrollHeight()) {
                        $(".toppaddingrow").each(function () {
                            $(this).height(newHeight);
                        });
                        $(".bottompaddingrow").each(function () {
                            $(this).height($scope.gantt.scroll.getScrollHeight() - newHeight - ($scope.gantt.rowsManager.visibleRows.length * rowHeight));
                        });
                    } else {
                        $(".toppaddingrow").each(function () {
                            $(this).height($scope.gantt.scroll.getScrollHeight() - ($scope.gantt.rowsManager.visibleRows.length * rowHeight));
                        });
                        $(".bottompaddingrow").each(function () {
                            $(this).height(0);
                        });
                    }
                } else {
                    $scope.gantt.rowsManager.updateVisibleObjects();
                }

                if (currentScrollLeft < lastScrollLeft && currentScrollLeft === 0) {
                    direction = 'left';
                    date = $scope.gantt.columnsManager.from;
                } else if (currentScrollLeft > lastScrollLeft && el.offsetWidth + currentScrollLeft >= el.scrollWidth - 1) {
                    direction = 'right';
                    date = $scope.gantt.columnsManager.to;
                }

                lastScrollLeft = currentScrollLeft;

                if (date !== undefined) {
                    if (autoExpandTimer) {
                        $timeout.cancel(autoExpandTimer);
                    }

                    autoExpandTimer = $timeout(function() {
                        autoExpandColumns(el, date, direction);
                    }, 300);
                } else {
                    $scope.gantt.api.scroll.raise.scroll(currentScrollLeft);
                }
            }, 5));

            $scope.getScrollableCss = function() {
                var css = {};

                var maxHeight = $scope.gantt.options.value('maxHeight');
                if (maxHeight > 0) {
                    css['max-height'] = maxHeight - $scope.gantt.header.getHeight() + 'px';
                    css['overflow-y'] = 'auto';

                    if ($scope.gantt.scroll.isVScrollbarVisible()) {
                        css['border-right'] = 'none';
                    }
                }

                var columnWidth = this.gantt.options.value('columnWidth');
                var bodySmallerThanGantt = $scope.gantt.width === 0 ? false: $scope.gantt.width < $scope.gantt.getWidth() - $scope.gantt.side.getWidth();
                if (columnWidth !== undefined && bodySmallerThanGantt) {
                    css.width = ($scope.gantt.width + this.gantt.scroll.getBordersWidth()) + 'px';
                }

                return css;
            };
        };
        return builder.build();
    }]);
}());

