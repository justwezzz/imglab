var tools = {
    labelling: {
        "tool-point": {
            type: "point",
            title: "Point",
            desp: "Create a feature point inside the concave polygon or boundary box",
            icon: "point.svg",
            drawable: true,
            actions: ["landmark", "colorpicker"],
            create: function (e, container) {
                var canvasOffset = myCanvas.node.getBoundingClientRect();
                return getPointToDraw(e, container, canvasOffset);
            },
            validate: function (el) {
                return true;
            }
        },
        "tool-circle": {
            type: "circle",
            title: "Circle",
            desp: "Create a circle",
            icon: "circle.svg",
            drawable: true,
            create: function () {
                var circle = myCanvas.nested().circle().radius().addClass('labelcircle shape')/* .draw() */;
                circle.resize();
                circle.draggable();
                // circle.parent().draggable();
                shapeEventHandler(circle);
                return circle;
            },
            validate: function (el) {
                return Number.parseInt(el.attr("r")) > 3;
            }
        },
        "tool-rectangle": {
            type: "rect",
            title: "Rectangle",
            desp: "Create a Boundary boxrectangle",
            icon: "rectangle.svg",
            drawable: true,
            create: function () {
                var rect = myCanvas.nested().rect().addClass('labelbox shape')/* .draw() */;
                rect.resize();
                rect.draggable();
                // rect.parent().draggable();
                shapeEventHandler(rect);
                return rect;
            },
            validate: function (el) {
                return Number.parseInt(el.attr("width")) > 3;
            },
        },
        "tool-polygon": {
            type: "poly",
            title: "Polygon",
            desp: "Create a concave polygon",
            icon: "polygon.svg",
            drawable: true,
            create: function () {//TODO: bug: creating duplicate points
                var poly = myCanvas.nested().polygon().addClass('labelpolygon shape')/* .draw() */;
                poly.resize();
                poly.draggable();
                // poly.parent().draggable();
                shapeEventHandler(poly);
                polygonEventHandler(poly);

                return poly;
            },
            validate: function (el) {
                return true;
            },
        }
    },
    canvas: {
        "tool-move": {
            title: "Move",
            desp: "Move an element or the entire workarea",
            icon: "move.svg",
            type: "move",
        },
        "tool-zoom": {
            title: "Zoom",
            desp: "Enlarge the workarea",
            icon_font: "icon-zoom-in",
            actions: ["zoom"]
        },
        "tool-light": {
            title: "Light",
            desp: "Highlight the labels",
            icon_font: "icon-lightbulb",
            actions: ["lightbulb"]
        }
    }
};

/**
 * Draws a featurePoint on myCanvas
 * @param {Event} position - click position
 * @param {SVGElement} container - shape that should hold the featurePoint
 * @param {DOMReact | Object} canvasOffset - offset due to canvas
 * @returns {SVGElement} SVGElement of featurePoint
 */
function getPointToDraw(position, container, canvasOffset) {
    // Get the parent svg element that surrounds the container
    var parentSvg = $('#' + container.node.id).closest('svg');
    var containerOffset = {
        x: parseInt(parentSvg.attr("x"), 10) || 0,
        y: parseInt(parentSvg.attr("y"), 10) || 0
    }
    // Feature point size should be local to each image
    var featurePointSize = labellingData[imgSelected.name].featurePointSize;
    var point = container.circle()
        .radius(Math.floor(featurePointSize))
        .attr({
            cx: position.x - canvasOffset.x - containerOffset.x,
            cy: position.y - canvasOffset.y - containerOffset.y
        })
        .addClass('labelpoint');
    // Set feature point colors with appConfig.featurePointColor
    $('.labelpoint').css('fill', appConfig.featurePointColor);
    point.draggable();
    return point;
}
var imgSelected = "";
var selectedElements = [];
var copiedElements;
var selectedTool = null, selectedElement = null;
var alreadyDrawing = false;
var eventBus; // Event bus used to propogate changes between tags

var plugins = {
    // "facepp" : {
    //     title: "Face Plus Plus",
    //     tagName: 'facepp'
    // }
}
var pluginsStore = {
    // "facepp" : {
    // }
}

var suggestedCategories = ["dog", "cat", "car", "vehicle", "truck", "animal", "building", "person"];
var suggestedTags = [];
var suggestedAttributes = {
    "gender": ["male", "female", "other"],
    "color": ["red", "green", "blue", "orange", "yellow", "white", "black"],
};
function toMoveMode() {
    $("#tool-move").click();
}

var chronology = new Chronology();
chronology.set({
    onUndo: function (occurence) {
        console.log('Undo');
    },
    onRedo: function (occurence) {
        console.log('Redo');
    },
    onBegin: function (occurence) {
        console.log('the beginning of the undo stack has been reached')
    },
    onEnd: function (occurence) {
        console.log('the end of the redo stack has been reached')
    }
})

let shortcutsHandler = function () {
    document.onkeydown = function (e) {
        if (e.key == 'z' && e.ctrlKey) {
            chronology.undo();
        } else if (e.key == 'y' && e.ctrlKey) {
            chronology.redo();
        }
    }
}
shortcutsHandler();

let shapeEventHandler = function (shape) {
    // shape = shape.parent();
    // let parentShape = shape.parent();
    console.log('shapeEventHandler');
    shape.on('dblclick',function () {
        toMoveMode();
    });

    shape.on('beforedrag', function () {
        console.log('beforedrag');
        shape.remember('oldX', shape.x())
        shape.remember('oldY', shape.y())
        shape.remember('oldZoomScale', imgSelected.size.imageScale)
    });

    shape.on('dragend', function (e) {
        console.log('dragend',e);
        var oldX = shape.remember('oldX')
            , oldY = shape.remember('oldY')
            , oldZoomScale = shape.remember('oldZoomScale')
            , newX = shape.x()
            , newY = shape.y()

        chronology.add({
            up: function () { 
                let sid = shape.id();
                let realShape = SVG.get(sid);
                let x = Math.floor(newX * imgSelected.size.imageScale / oldZoomScale);
                let y = Math.floor(newY * imgSelected.size.imageScale / oldZoomScale);
                realShape.move(x, y);
                updateShapeDetailInStore(realShape.id(), realShape.rbox(myCanvas), getPoints(realShape));
            }
            , down: function () { 
                let sid = shape.id();
                let realShape = SVG.get(sid);
                let x = Math.floor(oldX * imgSelected.size.imageScale / oldZoomScale);
                let y = Math.floor(oldY * imgSelected.size.imageScale / oldZoomScale);
                realShape.move(x, y);
                updateShapeDetailInStore(realShape.id(), realShape.rbox(myCanvas), getPoints(realShape));
            }
            , call: false //-> this makes sure the move is registered but not performed again after dragging
        })

        shape.forget('oldX')
        shape.forget('oldY')
        shape.forget('oldZoomScale')
        // e.preventDefault();
        // shape.fire('mouseup');
        // parentShape.fire('mouseup');
    });

    shape.on('resizestart', function (e) {
        console.log('resizestart');
        shape.remember('oldHeight', shape.height())
        shape.remember('oldWidth', shape.width())
        shape.remember('oldX', shape.x())
        shape.remember('oldY', shape.y())
    });

    shape.on('resizedone', function (e) {
        console.log('resizedone');
        var oldHeight = shape.remember('oldHeight')
            , oldWidth = shape.remember('oldWidth')
            , oldX = shape.remember('oldX')
            , oldY = shape.remember('oldY')
            , newHeight = shape.height()
            , newWidth = shape.width()
            , newX = shape.x()
            , newY = shape.y()

        chronology.add({
            up: function () { 
                let sid = shape.id();
                let realShape = SVG.get(sid);
                realShape.size(newWidth, newHeight); 
                realShape.move(newX, newY) 
            }
            , down: function () { 
                let sid = shape.id();
                let realShape = SVG.get(sid);
                realShape.size(oldWidth, oldHeight); 
                realShape.move(oldX, oldY) 
            }
            , call: false //-> this makes sure the move is registered but not performed again after dragging
        })

        shape.forget('oldHeight')
        shape.forget('oldWidth')
        shape.forget('oldX')
        shape.forget('oldY')
    })
}

let polygonEventHandler = function(poly){
    poly.on('drawstart', function (e) {
        document.addEventListener('keydown', function (e) {
            if (e.keyCode == 13) {
                poly.draw('done');
                poly.off('drawstart');

                /* poly.on('dblclick', function(event){
                    if(selectedTool.type === "poly"){
                        var points = myCanvas.point(event.x, event.y);
                        var polyArray = poly.array().valueOf();
                        for(var p_i=0; p_i< polyArray.length; p_i++){
                            var point1 = polyArray[ p_i];
                            var point2 = [];

                            if(i === length -1 ){
                                point2 = polyArray[ 0];
                            }else{
                                point2 = polyArray[ p_i + 1 ];
                            }
                            var distance  = pDistance(point1[0], point1[1], point2[0], point2[1], points.x, points.y);
                            if(distance < 11){
                                polyArray.splice(p_i+1, 0, [points.x, points.y] );
                                poly.plot(polyArray);
                                break;
                            }
                        }
                    }
                }) */
            }
        });
    });
    // poly.on('drawpoint', function (e){
    //     console.log('drawpoint',e);
    // })
}

function getPoints(shape) {
    var points;

    switch (shape.type) {
        case "rect":
            var box = shape.rbox(myCanvas);
            return [box.x, box.y, box.w, box.h];
        case "circle":
            var box = shape.rbox(myCanvas);
            return [box.cx, box.cy, shape.attr("r")];
        /* case "ellipse":
            var box = shape.rbox(myCanvas);
            return [box.cx, box.cy, box.rx, box.ry]; */
        case "polygon":
            //Polygon points are relative to it's container SVG
            var parentSvg = $('#' + shape.node.id).closest('svg');
            var calculatedPoints = [];
            var vector = {
                x: parseInt(parentSvg.attr("x"), 10) || 0,
                y: parseInt(parentSvg.attr("y"), 10) || 0
            }
            shape.array().value.forEach(ponitArr => {
                calculatedPoints.push([ponitArr[0] + vector.x, ponitArr[1] + vector.y]);
            });
            return calculatedPoints;
        /* case "line":
            console.log(shape.array())
            points = [];
            break;
        case "path":
            console.log(shape.array())
            points = [];
            break; */
    }
}