/**
 * Copyright (c) 2013 Oculus Info Inc.
 * http://www.oculusinfo.com/
 *
 * Released under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
define(['jquery', 'lib/interfaces/xfUIObject', 'lib/channels', 'lib/util/xfUtil', 'lib/extern/underscore'],
    function($, xfUIObject, chan, xfUtil) {

        //--------------------------------------------------------------------------------------------------------------
        // Private Variables
        //--------------------------------------------------------------------------------------------------------------

        var MODULE_NAME = 'xfCluster';

        var xfClusterToolBarSpecTemplate = {
            allowFile           : true,
            allowSearch         : false,
            allowFocus          : true,
            allowClose          : false,
            allowPin			: true
        };

        var xfClusterChartSpecTemplate = {
            startValue          : 0,
            endValue            : 0,
            credits             : [],
            debits              : [],
            maxCredit           : 0,
            maxDebit            : 0,
            maxBalance          : 0,
            minBalance          : 0,
            focusCredits        : [],
            focusDebits         : []
        };

        var xfClusterSpecTemplate = {
            parent              : {},
            dataId              : '',
            isCluster           : true,
            count               : 0,
            members             : [],
            icons               : [],
            detailsTextNodes    : [],
            graphUrl            : '',
            flow                : {},
            duplicateCount      : 1,
            label               : '',
            confidenceInSrc     : 1.0,
            confidenceInAge     : 1.0,
            leftOperation       : 'branch',
            rightOperation      : 'branch'
        };

        //--------------------------------------------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------------------------------------------

        var xfClusterModule = {};

        //--------------------------------------------------------------------------------------------------------------

        xfClusterModule.createInstance = function(uiObjectState){

            var _UIObjectState = uiObjectState;
            
            // create new object instance
            var xfClusterInstance = {};
            xfUIObject.implementedBy(xfClusterInstance, MODULE_NAME);

            //if(_UIObjectState.spec.count != null && _UIObjectState.spec.count > 1) {
            //    _UIObjectState.spec.summaryTextNodes[0] = _UIObjectState.spec.label + ' (+' +  (_UIObjectState.spec.count-1) + ')';
            //}

            //------------------------
            // UIObject Implementation
            //------------------------

            xfClusterInstance.clone = function() {
                console.error(MODULE_NAME + " is an abstract base class and should not be cloned");
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getXfId = function() {
                return _UIObjectState.xfId;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getDataId = function() {
                return _UIObjectState.spec.dataId;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getUIType = function() {
                return _UIObjectState.UIType;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.isCluster = function() {
                return true;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getLabel = function() {
                return _UIObjectState.spec.label;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getUIObjectByXfId = function(xfId) {

                if (_UIObjectState.isExpanded) {
                    for (var i = 0; i < _UIObjectState.children.length; i++) {
                        var object = _UIObjectState.children[i].getUIObjectByXfId(xfId);
                        if (object != null) {
                            return object;
                        }
                    }

                }

                if (xfId != null && _UIObjectState.xfId == xfId) {
                    return xfClusterInstance;
                }

                return null;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getUIObjectsByDataId = function(dataId) {
                var objectList = [];

                if (_UIObjectState.isExpanded) {
                    for (var i = 0; i < _UIObjectState.children.length; i++) {
                        var membersList = _UIObjectState.children[i].getUIObjectsByDataId(dataId);
                        for (var j = 0; j < membersList.length; j++) {
                            objectList.push(membersList[j]);
                        }
                    }
                }

                if (dataId == _UIObjectState.spec.dataId) {
                    objectList.push(xfClusterInstance);
                }

                return objectList;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getParent = function() {
                return _UIObjectState.spec.parent;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.setParent = function(xfUIObj){
                _UIObjectState.spec.parent = xfUIObj;

                xfClusterInstance.updateToolbar();
            };

            //----------------------------------------------------------------------------------------------------------

            /**
             * Returns a map of all the links incident on the cluster.
             * If the cluster is expanded, this returns a map of all
             * the cluster CHILDREN's links.
             * @returns {*}
             */
            xfClusterInstance.getLinks = function() {

                if (_UIObjectState.isExpanded) {
                    var links = {};

                    for (var i = 0; i < _UIObjectState.children.length; i++) {
                        var childLinks = _UIObjectState.children[i].getLinks();
                        for (var xfId in childLinks) {
                            if (childLinks.hasOwnProperty(xfId)) {
                                links[xfId] = childLinks[xfId];
                            }
                        }
                    }

                    return links;
                }

                return _UIObjectState.links;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getIncomingLinks = function() {

                var xfId= null, i;
                var incomingLinks = {};

                if (_UIObjectState.isExpanded) {
                    for (i = 0; i < _UIObjectState.children.length; i++) {
                        var childLinks = _UIObjectState.children[i].getIncomingLinks();
                        for (xfId in childLinks) {
                            if (childLinks.hasOwnProperty(xfId)) {
                                incomingLinks[xfId] = childLinks[xfId];
                            }
                        }
                    }
                } else {
                    for (xfId in _UIObjectState.links) {
                        if (_UIObjectState.links.hasOwnProperty(xfId)) {
                            var link = _UIObjectState.links[xfId];
                            if (link.getDestination().getXfId() == _UIObjectState.xfId) {
                                incomingLinks[link.getXfId()] = link;
                            }
                        }
                    }
                }

                return incomingLinks;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getOutgoingLinks = function() {

                var i, xfId= null;
                var outgoingLinks = {};

                if (_UIObjectState.isExpanded) {
                    for (i = 0; i < _UIObjectState.children.length; i++) {
                        var childLinks = _UIObjectState.children[i].getOutgoingLinks();
                        for (xfId in childLinks) {
                            if (childLinks.hasOwnProperty(xfId)) {
                                outgoingLinks[xfId] = childLinks[xfId];
                            }
                        }
                    }
                } else {
                    for (xfId in _UIObjectState.links) {
                        if (_UIObjectState.links.hasOwnProperty(xfId)) {
                            var link = _UIObjectState.links[xfId];
                            if (link.getSource().getXfId() == _UIObjectState.xfId) {
                                outgoingLinks[link.getXfId()] = link;
                            }
                        }
                    }
                }

                return outgoingLinks;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.addLink = function(link) {

                if ((link.getSource().getXfId() != this.getXfId() &&
                    link.getDestination().getXfId() != this.getXfId()) ||
                    (link.getXfId() in _UIObjectState.links)
                ) {
                    return false;
                }

                _UIObjectState.links[link.getXfId()] = link;
                return true;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.removeLink = function(xfId) {

                var removedLink = false;

                if (_UIObjectState.links.hasOwnProperty(xfId)) {
                    delete _UIObjectState.links[xfId];
                    removedLink = true;
                } else {
                    for (var i = 0; i < _UIObjectState.children.length; i++) {
                        removedLink = _UIObjectState.children[i].removeLink(xfId);
                        if (removedLink) {
                            break;
                        }
                    }
                }

                return removedLink;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.removeAllLinks = function(linkType) {
                var tempLinkMap = _.clone(_UIObjectState.links);
                for (var linkId in tempLinkMap) {
                    if (tempLinkMap.hasOwnProperty(linkId)) {
                        tempLinkMap[linkId].remove();
                    }
                }

                for (var i = 0; i < _UIObjectState.children.length; i++) {
                    _UIObjectState.children[i].removeAllLinks(linkType);
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.collapseLinks = function(direction, deleteAfterCollapse) {

                var i;

                if (_UIObjectState.isExpanded) {

                    for (i = 0; i < _UIObjectState.children.length; i++) {
                        _UIObjectState.children[i].collapseLinks(direction, true);
                    }

                    if (_UIObjectState.children.length == 0) {
                        aperture.pubsub.publish(chan.REMOVE_REQUEST, {xfId : this.getXfId()});
                    }

                } else {

                    var targetEntities = [];

                    var links = _.clone(_UIObjectState.links);
                    for (var linkId in links) {
                        if (links.hasOwnProperty(linkId)) {
                            var link = _UIObjectState.links[linkId];
                            var src = link.getSource();
                            var dest = link.getDestination();
                            var foundLink = false;

                            if (direction == 'right') {
                                if (src.getXfId() == _UIObjectState.xfId) {
                                    targetEntities.push(dest);
                                    foundLink = true;
                                }
                            } else {
                                if (dest.getXfId() == _UIObjectState.xfId) {
                                    targetEntities.push(src);
                                    foundLink = true;
                                }
                            }

                            if (foundLink && !xfUtil.isUITypeDescendant(targetEntities[targetEntities.length-1], 'xfFile')) {
                                link.remove();
                            }
                        }
                    }

                    for (i = 0; i < targetEntities.length; i++) {
                        targetEntities[i].collapseLinks(direction, true);
                    }

                    if (deleteAfterCollapse) {
                        if (_.size(_UIObjectState.links) == 0) {
                            // Check if this card is a descendant of a match card.
                            if (!xfUtil.isUITypeDescendant(this, 'xfFile')){
                            	this.getParent().removeChild(this.getXfId(), true, true);
                            }
                        }
                    }
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.isLinkedTo = function(uiObject) {
                var links = xfClusterInstance.getLinks();
                var linkedUIObjects = {};
                for (var linkId in links) {
                    if (links.hasOwnProperty(linkId)) {
                        var link = links[linkId];
                        linkedUIObjects[link.getSource().getXfId()] = true;
                        linkedUIObjects[link.getDestination().getXfId()] = true;
                    }
                }

                return linkedUIObjects[uiObject.getXfId()];
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.remove = function(eventChannel, data) {
                if (chan.REMOVE_REQUEST == eventChannel){

                    for (var linkId in _UIObjectState.links) {
                        if (_UIObjectState.links.hasOwnProperty(linkId)) {
                            _UIObjectState.links[linkId].remove();
                        }
                    }

                    _UIObjectState.spec.parent.removeChild(
                        _UIObjectState.xfId,
                        (data.dispose != null) ? data.dispose : true,
                        false
                    );
                }
                else {
                    console.error('Invalid or missing publish event. Unable to remove ' + MODULE_NAME + ': ' + _UIObjectState.xfId);
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.update = function(spec) {
                for (var key in spec) {
                    if (spec.hasOwnProperty(key)) {
                        _UIObjectState.spec[key] = spec[key];
                    }
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.updateToolbar = function(spec) {
                for (var key in spec) {
                    if (spec.hasOwnProperty(key)) {
                        _UIObjectState.toolbarSpec[key] = spec[key];
                    }
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.showDetails = function(bShow) {
                if (bShow != null){
                    _UIObjectState.showDetails = bShow;

                    for (var i = 0; i < _UIObjectState.children.length; i++) {
                        _UIObjectState.children[i].showDetails(bShow);
                    }
                }

                return _UIObjectState.showDetails;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getSpecs = function(bOnlyEmptySpecs) {

                var specs = [];

                if (_UIObjectState.isExpanded) {

                    for (var i = 0; i < _UIObjectState.children.length; i++) {
                        var childSpecs = _UIObjectState.children[i].getSpecs(bOnlyEmptySpecs);
                        for (var j = 0; j < childSpecs.length; j++) {
                            specs.push(childSpecs[j]);
                        }
                    }
                    return specs;
                }

                if (bOnlyEmptySpecs) {
                    if (_UIObjectState.spec.graphUrl == '' || _.size(_UIObjectState.spec.detailsTextNodes) == 0) {
                        specs.push(_.clone(_UIObjectState.spec));
                    }
                } else {
                    specs.push(_.clone(_UIObjectState.spec));
                }

                return specs;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getVisualInfo = function() {
                return _.clone(_UIObjectState);
            };

            //----------------------------------------------------------------------------------------------------------
            
            xfClusterInstance.isHighlighted = function() {
                return _UIObjectState.isHighlighted;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.highlightId = function(xfId) {

                var i;

                if (_UIObjectState.xfId == xfId) {
                	// local and children are highlighted
                    if (_UIObjectState.isExpanded) {
                        _UIObjectState.isHighlighted = true;
                        
                        for (i = 0; i < _UIObjectState.children.length; i++) {
                        	// give the children their id
                            _UIObjectState.children[i].highlightId(_UIObjectState.children[i].getXfId());
                        }
                        
                    } else if (!_UIObjectState.isHighlighted) {
                        _UIObjectState.isHighlighted = true;
                    }
                } else {
                    // If this id belongs to this objects parent,
                    // and that parent is expanded, the child
                    // shall also inherit the highlight.
                    if (xfUtil.isClusterType(this.getParent()) && this.getParent().isExpanded() && this.getParent().isHighlighted()){
                        _UIObjectState.isHighlighted = true;
                    }
                    else {
                        // local IS NOT highlighted
                        if (_UIObjectState.isHighlighted) {
                            _UIObjectState.isHighlighted = false;
                        }
                    }

                    // child MAY be highlighted
                    for (i = 0; i < _UIObjectState.children.length; i++) {
                        _UIObjectState.children[i].highlightId(xfId);
                    }
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.isSelected = function() {
                return _UIObjectState.isSelected;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.setSelection = function(xfId) {

                if (xfId == null || _UIObjectState.xfId != xfId) {
                    if (_UIObjectState.isSelected) {
                        _UIObjectState.isSelected = false;
                    }
                } else {
                    if (!_UIObjectState.isSelected) {
                        _UIObjectState.isSelected = true;
                    }
                }

                for (var i = 0; i < _UIObjectState.children.length; i++) {
                    _UIObjectState.children[i].setSelection(xfId);
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.isHovered = function() {
                return _UIObjectState.isHovered;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.setHovering = function(xfId) {

                if(!_UIObjectState.isExpanded) {
                    var stateChanged = false;
                    if (_UIObjectState.xfId == xfId) {
                        if (!_UIObjectState.isHovered) {
                            _UIObjectState.isHovered = true;
                            stateChanged = true;
                        }
                    } else {
                        if (_UIObjectState.isHovered) {
                            _UIObjectState.isHovered = false;
                            stateChanged = true;
                        }
                    }

                    if (stateChanged) {
                        aperture.pubsub.publish(chan.RENDER_UPDATE_REQUEST, {UIObject : xfClusterInstance});
                    }
                }
                else {
                    for (var i = 0; i < _UIObjectState.children.length; i++) {
                        _UIObjectState.children[i].setHovering(xfId);
                    }
                }
            };

            //----------------------------------------------------------------------------------------------------------
            
            xfClusterInstance.expand = function() {

                if (_UIObjectState.isExpanded) {
                    return;
                }

                for (var linkId in _UIObjectState.links) {
                    if (_UIObjectState.links.hasOwnProperty(linkId)) {
                        _UIObjectState.links[linkId].remove();
                    }
                }

                _UIObjectState.isExpanded = true;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.collapse = function() {

                if (!_UIObjectState.isExpanded) {
                    return;
                }

                for (var i = 0; i < _UIObjectState.children.length; i++) {
                    var childLinks = _UIObjectState.children[i].getLinks();
                    for (var childLinkId in childLinks) {
                        if (childLinks.hasOwnProperty(childLinkId)) {
                            childLinks[childLinkId].remove();
                        }
                    }

                    if (_UIObjectState.children[i].isSelected()) {
                        _UIObjectState.children[i].setSelection(null);
                    }
                }

                _UIObjectState.isExpanded = false;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.setDuplicateCount = function(count) {

                if (_UIObjectState.spec.duplicateCount == count) {
                    return;
                }

                _UIObjectState.spec.duplicateCount = count;
                aperture.pubsub.publish(chan.RENDER_UPDATE_REQUEST, {UIObject : xfClusterInstance});
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getVisibleDataIds = function() {

                var visibleDataIds = [];

                if (!_UIObjectState.isExpanded) {

                    if (_UIObjectState.spec.dataId == null) {
                        return visibleDataIds;
                    }

                    visibleDataIds.push(_UIObjectState.spec.dataId);
                    return visibleDataIds;
                }

                for (var i = 0; i < _UIObjectState.children.length; i++) {

                    var childDataId =  _UIObjectState.children[i].getVisibleDataIds();
                    for (var j = 0; j < childDataId.length; j++) {
                        visibleDataIds.push(childDataId[j]);
                    }
                }

                return visibleDataIds;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.cleanState = function() {

                _UIObjectState.xfId = '';
                _UIObjectState.UIType = MODULE_NAME;
                _UIObjectState.spec = _.clone(xfClusterSpecTemplate);
                _UIObjectState.children = [];
                _UIObjectState.isExpanded = false;
                _UIObjectState.isSelected = false;
                _UIObjectState.isHighlighted = false;
                _UIObjectState.isHovered = false;
                _UIObjectState.showToolbar = false;
                _UIObjectState.showDetails = false;
                _UIObjectState.showSpinner = false;
                _UIObjectState.isPinned = false;
                _UIObjectState.links = {};
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.exportState = function() {

                var i;
                var state = {};

                state['node'] = {};
                state['node']['parent'] = _UIObjectState.spec.parent.getXfId();
                state['node']['dataId'] = _UIObjectState.spec.dataId;
                state['node']['isCluster'] = _UIObjectState.spec.isCluster;
                state['node']['count'] = _UIObjectState.spec.count;
                state['node']['icons'] = _UIObjectState.spec.icons;
                state['node']['detailsTextNodes'] = _UIObjectState.spec.detailsTextNodes;
                state['node']['graphUrl'] = _UIObjectState.spec.graphUrl;
                state['node']['duplicateCount'] = _UIObjectState.spec.duplicateCount;
                state['node']['label'] = _UIObjectState.spec.label;
                state['node']['confidenceInSrc'] = _UIObjectState.spec.confidenceInSrc;
                state['node']['confidenceInAge'] = _UIObjectState.spec.confidenceInAge;
                state['node']['flow'] = _UIObjectState.spec.flow;
                state['node']['startValue'] = _UIObjectState.spec.chartSpec.startValue;
                state['node']['endValue'] = _UIObjectState.spec.chartSpec.endValue;
                state['node']['credits'] = _UIObjectState.spec.chartSpec.credits;
                state['node']['debits'] = _UIObjectState.spec.chartSpec.debits;
                state['node']['maxCredit'] = _UIObjectState.spec.chartSpec.maxCredit;
                state['node']['maxDebit'] = _UIObjectState.spec.chartSpec.maxDebit;
                state['node']['maxBalance'] = _UIObjectState.spec.chartSpec.maxBalance;
                state['node']['minBalance'] = _UIObjectState.spec.chartSpec.minBalance;

                state['link'] = {};
                for (i = 0; i < _UIObjectState.links; i++) {
                    var link = _UIObjectState.links[i];
                    state['link'].push(link.getXfId(), link.exportState());
                }

                state['children'] = [];
                for (i = 0; i < _UIObjectState.children.length; i++) {
                    state['children'].push(_UIObjectState.children[i].exportState());
                }

                return state;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.saveState = function() {

                var i;
                var state = {};

                state['xfId'] = _UIObjectState.xfId;
                state['UIType'] = _UIObjectState.UIType;

                state['isExpanded'] = _UIObjectState.isExpanded;
                state['isSelected'] = _UIObjectState.isSelected;
                state['isHighlighted'] = _UIObjectState.isHighlighted;
                state['showToolbar'] = _UIObjectState.showToolbar;
                state['showDetails'] = _UIObjectState.showDetails;
                state['showSpinner'] = false;
                state['isPinned'] = _UIObjectState.isPinned;
                state['toolbarSpec'] = _UIObjectState.toolbarSpec;

                state['spec'] = {};
                state['spec']['parent'] = _UIObjectState.spec.parent.getXfId();
                state['spec']['dataId'] = _UIObjectState.spec.dataId;
                state['spec']['isCluster'] = _UIObjectState.spec.isCluster;
                state['spec']['count'] = _UIObjectState.spec.count;
                state['spec']['icons'] = _UIObjectState.spec.icons;
                state['spec']['detailsTextNodes'] = _UIObjectState.spec.detailsTextNodes;
                state['spec']['graphUrl'] = _UIObjectState.spec.graphUrl;
                state['spec']['duplicateCount'] = _UIObjectState.spec.duplicateCount;
                state['spec']['label'] = _UIObjectState.spec.label;
                state['spec']['confidenceInSrc'] = _UIObjectState.spec.confidenceInSrc;
                state['spec']['confidenceInAge'] = _UIObjectState.spec.confidenceInAge;
                state['spec']['leftOperation'] = _UIObjectState.spec.leftOperation;
                state['spec']['rightOperation'] = _UIObjectState.spec.rightOperation;
                state['spec']['flow'] = _UIObjectState.spec.flow;
                state['spec']['members'] = _UIObjectState.spec.members;

                state['children'] = [];
                for (i = 0; i < _UIObjectState.children.length; i++) {
                    state['children'].push(_UIObjectState.children[i].saveState());
                }

                return state;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.restoreHierarchy = function(state, workspace) {
                _UIObjectState.spec.parent = workspace.getUIObjectByXfId(state.spec.parent);
                if (_UIObjectState.isExpanded) {
                    for (var i = 0; i < state.children.length; i++) {

                        var childState = state.children[i];
                        var childObject = workspace.getUIObjectByXfId(childState.xfId);
                        if (childObject) {
                            childObject.restoreHierarchy(childState, workspace);
                        }
                    }
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.dispose = function() {

                if (_UIObjectState.isSelected) {
                    aperture.pubsub.publish(
                        chan.SELECTION_CHANGE_REQUEST,
                        {
                            xfId: null,
                            selected : true,
                            noRender: true
                        }
                    );
                }

                _UIObjectState.spec.parent = null;
                _UIObjectState.spec.flow = null;
                _UIObjectState.toolbarSpec = null;
                _UIObjectState.spec = null;

                for (var i = 0; i < _UIObjectState.children.length; i++) {
                    _UIObjectState.children[i].dispose();
                    _UIObjectState.children[i] = null;
                }
                _UIObjectState.children = null;

                for (var linkId in _UIObjectState.links) {
                    if (_UIObjectState.links.hasOwnProperty(linkId)) {
                        _UIObjectState.links[linkId].remove();
                    }
                }
                _UIObjectState.links = null;

                _UIObjectState = null;
            };

            //--------------------------------
            // Cluster Specific Implementation
            //--------------------------------

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.showSpinner = function(bShow) {
                if (bShow != null){
                    if (_UIObjectState.isExpanded) {
                        for (var i = 0; i < _UIObjectState.children.length; i++) {
                            _UIObjectState.children[i].showSpinner(bShow);
                        }
                    } else {
                        if (_UIObjectState.showSpinner != bShow) {
                            _UIObjectState.showSpinner = bShow;
                        }
                    }
                }

                return _UIObjectState.showSpinner;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.showToolbar = function(bShow) {
                if (bShow != null){
                    if (_UIObjectState.isExpanded) {
                        for (var i = 0; i < _UIObjectState.children.length; i++) {
                            _UIObjectState.children[i].showToolbar(bShow);
                        }
                    } else {
                        if (_UIObjectState.showToolbar != bShow) {
                            _UIObjectState.showToolbar = bShow;
                        }
                    }
                }

                return _UIObjectState.showToolbar;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getChildren = function() {
                return _.clone(_UIObjectState.children);
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.isExpanded = function() {
                return _UIObjectState.isExpanded;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getLeftOperation = function() {
                return _UIObjectState.spec.leftOperation;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.getRightOperation = function() {
                return _UIObjectState.spec.rightOperation;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.setLeftOperation = function(op) {
                _UIObjectState.spec.leftOperation = op;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.setRightOperation = function(op) {
                _UIObjectState.spec.rightOperation = op;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.setPin = function(isPinned) {
                _UIObjectState.isPinned = isPinned;
                for (var i = 0; i < _UIObjectState.children.length; i++) {
                    _UIObjectState.children[i].setPin(_UIObjectState.isPinned);
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.togglePin = function() {
                _UIObjectState.isPinned = !_UIObjectState.isPinned;
                for (var i = 0; i < _UIObjectState.children.length; i++) {
                    _UIObjectState.children[i].setPin(_UIObjectState.isPinned);
                }
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.isPinned = function() {
                return _UIObjectState.isPinned;
            };

            //----------------------------------------------------------------------------------------------------------

            xfClusterInstance.hasSelectedChild = function() {
                var childSelected = false;

                for (var i = 0; i < _UIObjectState.children.length; i++) {
                    if (_UIObjectState.children[i].isSelected()) {
                        childSelected = true;
                        break;
                    }
                }

                return childSelected;
            };

            //----------------------------------------------------------------------------------------------------------

            return xfClusterInstance;
        };

        //--------------------------------------------------------------------------------------------------------------

        xfClusterModule.getSpecTemplate = function() {

            var specTemplate = _.clone(xfClusterSpecTemplate);
            specTemplate.chartSpec = _.clone(xfClusterChartSpecTemplate);

            return specTemplate;
        };

        //--------------------------------------------------------------------------------------------------------------

        xfClusterModule.getToolbarSpecTemplate = function() {
            return _.clone(xfClusterToolBarSpecTemplate);
        };

        //--------------------------------------------------------------------------------------------------------------

        xfClusterModule.getModuleName = function() {
            return MODULE_NAME;
        };

        //--------------------------------------------------------------------------------------------------------------

        return xfClusterModule;
    }
);