(function(){
    'use strict';
    angular.module('gantt').filter('ganttRowLimit', [ '$filter', function($filter) {
        // filter to find subset of full dataset that is in a buffer range for rendering, based on scroll position of full collection

        // Ideal implementation would be simply to move our buffer around and not worry about removing a parent to maintain hierarchy
        //     var end = Math.min(buffer + offset, input.length);
        //     var start = 0;
        //     if(offset > buffer){
        //         start = end - buffer;
        //     }
        //     return input.slice(start, end);

        return function(input, gantt, rowHeight) {
            var buffer = gantt.scroll.getScrollBuffer();   //  +/- buffer for vertical infinite scroll

            // get offset row index so we can move our buffer around in the full dataset
            var offset = 0;
            offset = Math.floor(Math.min(gantt.scroll.getScrollTop(), gantt.scroll.getScrollHeight()) / rowHeight)

            //chop off the area of source data beyond the buffer
            var end = Math.min(buffer + offset, input.length);
            var visibleRows = input.slice(0, end);

            //starting from end, collect the required parent nodes that we have to keep, if we have a full buffer and we will be truncating from the beginning of array
            var requiredParents = [];
            if(visibleRows.length > buffer){
                // visibleRows = visibleRows.slice(visibleRows.length - (buffer * 2));
                for(var i = visibleRows.length - 1; i >= (end - (buffer)); i --){
                    //keep any required parents to fulfill the hierarchy
                    var row = visibleRows[i];
                    if(row.model.parent != undefined && requiredParents.indexOf(row.model.parent) == -1){
                        requiredParents.push(row.model.parent);
                    }
                }

                //remove the set of rows BEFORE our rendered set
                //put any required parents found at the start of our visible collection
                var removedArray = visibleRows.splice(0, end - (buffer));
                for(var i = removedArray.length - 1; i >= 0; i--){
                    if(requiredParents.indexOf(removedArray[i].model.id) != -1){
                        visibleRows.unshift(removedArray[i]);
                    }
                }
            }
            // console.log("filtered: " + visibleRows.length + " end: " + end);
            return visibleRows;
        }

    }]);
}());

