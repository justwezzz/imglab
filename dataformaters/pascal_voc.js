var pascalVocFormater = {
    fromPascalVOC : function(pascalVocData){
        console.log('fromPascalVOC',pascalVocData);
        let idNumber = 1000;
        let idPrefix = "SvgjsRect";
        let annotation = pascalVocData.annotation;
        let data = {
            imagename:annotation.filename,
            attributes:[],
            tags:[],
            size:annotation.size,
            shapes:[],
            shapeIndex:0,
            pointIndex:0,
            featurePointSize:3,
        }
        let rects = annotation.object;
        for (let index = 0; index < rects.length; index++) {
            let rect = rects[index];
            let rect_bndbox = rect.bndbox;
            let rect_width=rect_bndbox.xmax-rect_bndbox.xmin;
            let rect_height=rect_bndbox.ymax-rect_bndbox.ymin;
            let points = [rect_bndbox.xmin,rect_bndbox.ymin,rect_width,rect_height];
            let bbox = {
                x:rect_bndbox.xmin,
                y:rect_bndbox.ymin,
                w:rect_width,
                h:rect_height
            }
            let shape = {
                id:idPrefix+idNumber++,
                label:rect.name,
                attributes:[],
                tags:[],
                type:"rect",
                points:points,
                bbox:bbox
            }
            data.shapes.push(shape);
        }
        console.log(data);
        // return data;
        labellingData[annotation.filename] = data;
    },
    toPascalVOC : function(){

        var exportData = `<?xml version="1.0"?>
<annotation>
    <folder>images</folder>
    <filename>${imgSelected.name}</filename>
    <path>images/${imgSelected.name}</path>
    <source>
        <database>Unknown</database>
    </source>
    <size>
        <width>${imgSelected.size.width}</width>
        <height>${imgSelected.size.height}</height>
        <depth>3</depth>
    </size>
    <segmented>0</segmented>`
        //Add images
        var image = labellingData[ imgSelected.name ];
        var shapes = image.shapes.filter(s=>$('#'+s.id).css('display') !== 'none');
        // for(var shape_i = 0 ; shape_i < image.shapes.length; shape_i++){
        for(var shape_i = 0 ; shape_i < shapes.length; shape_i++){
            var shape = shapes[ shape_i ];
            exportData += `
    <object>
        <name>${shape.label}</name>
        <pose>Unspecified</pose>
        <truncated>0</truncated>
        <difficult>0</difficult>
        <bndbox>
            <xmin>${shape.bbox.x}</xmin>
            <ymin>${shape.bbox.y}</ymin>
            <xmax>${shape.bbox.x + shape.bbox.w}</xmax>
            <ymax>${shape.bbox.y + shape.bbox.h}</ymax>
        </bndbox>
    </object>`;
        }
        exportData += "\n</annotation>";

        return exportData;
    }

}
