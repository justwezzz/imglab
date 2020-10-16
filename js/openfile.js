function openDataFile(){
    $.dialog({
        title: 'Open/Import',
        content: `<p>Due to the security reasons, browser doesn't allow to load the images.
        So please load the images manually.</p>
        <div style="text-align:center;">
            <label class="btn btn-primary btn-bs-file">Browse
                <input id="browse" type="file" class="filebutton" accept=".fpp,.nimn,.xml,.json"   />
            </label>
        <div>`,
        escapeKey: true,
        backgroundDismiss: true,
        onContentReady: function(){
            $("#browse").bind("change", function(input) {
                readDataFile(input);
           });
        }
    });
}

function readDataFile(e){
    var input = e.target || e.srcElement;
    let e_type = e.toString();
    let e_is_file = e_type.includes("File");

    if (e_is_file || (input.files && input.files[0])) {
        var dataFile = e_is_file?e:input.files[0];
        
        var reader = new FileReader();
        reader.onload = function (e) {
            /* if(pointFile.name.endsWith(".pts")){
                loadPts(e.target.result);
            }else*/ if(dataFile.name.endsWith(".json")){
                loadJSONFile(e.target.result);
            }else if(dataFile.name.endsWith(".nimn")){
                loadProjectFile(e.target.result);
            }else if(dataFile.name.endsWith(".fpp")){
                loadFpp(e.target.result);
            }else if(dataFile.name.endsWith(".xml")){
                // loadDlibXml(e.target.result);
                loadVOCFile(e.target.result);
            }else{
                console.log("Not supported");
            }
            eventBus.trigger('area_update');
        };

        reader.readAsText(dataFile);
    }
    if(!e_is_file)
        input.value = null;
}


var loadVOCFile = function(data){
    var obj = parser.parse(data,{
        ignoreAttributes : false,
        attributeNamePrefix : "",
    });
    pascalVocFormater.fromPascalVOC(obj);
}

var loadJSONFile = function(data){
    labellingData = cocoFormater.fromCOCO(JSON.parse(data));
}

var loadProjectFile = function(data){
    labellingData = nimn.parse(nimnSchema, data);
    //labellingData =  JSON.parse(data);
}
var loadDlibXml = function(data){
    console.log('loadDlibXml',data);
    var obj = parser.parse(data,{
        ignoreAttributes : false,
        attributeNamePrefix : "",
    });

    //labellingData = {};
    var image = obj.dataset.images.image;

    if(!Array.isArray(image)){
        image = [image];
    }

    for(var index=0; index < image.length; index++){//for each image
        var pathArr = image[index].file.split(/\\|\//);
        var imgName = pathArr[ pathArr.length -1 ];
        var boxes = image[ index ].box;
        var boxObject = [];
        if(boxes){
            if(!Array.isArray(boxes)){
                boxes = [boxes];
            }
            for(var b_index =0; b_index < boxes.length; b_index++){//for each box
                var currentBox = boxes[ b_index ];

                boxObject .push({
                    id : "rect" + b_index,
                    label: currentBox.label,
                    type: "rect",
                    bbox : {
                        x: currentBox.left,
                        y: currentBox.top,
                        h: currentBox.height,
                        w: currentBox.width,
                        /* ignore: currentBox.ignore */
                        /* pose='4' detection_score='4' */
                    },
                    points : [
                        currentBox.left, 
                        currentBox.top, 
                        currentBox.width, 
                        currentBox.height
                    ],
                    attributes : [],
                    featurePoints: [],
                    tags: []
                })
                if(currentBox.part){
                    if(!Array.isArray(currentBox.part)){
                        currentBox.part = [currentBox.part];
                    }

                    for(var p_index=0; p_index< currentBox.part.length; p_index++){//for each part
                        var pointlabel = currentBox.part[p_index].name || p_index+1;

                        boxObject[b_index].featurePoints.push({
                            id: "point" + p_index,
                            x: currentBox.part[p_index].x/*  - currentBox.left */,
                            y: currentBox.part[p_index].y/*  - currentBox.top */,
                            label: pointlabel
                        })
                    }//End - for each part
                }
            }//End - for each box
        }

        if(labellingData[imgName]){
            labellingData[imgName].shapes =  boxObject;
        }
    }//End - for each image

}

