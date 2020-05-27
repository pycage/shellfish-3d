/*******************************************************************************
This file is part of Shellfish-3D.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************************************************************************/

"use strict";

shRequire([__dirname + "/entity.js",
           __dirname + "/solidmaterial.js",
           __dirname + "/util/objparser.js",
           __dirname + "/util/util.js",
           __dirname + "/util/m4.js"], (entity, solidMtl, objParser, util, m4) =>
{
    const d = new WeakMap();
    
    /**
     * Class representing a 3D model loaded from file.
     * 
     * Currently supported file formats:
     *  * Wavefront OBJ along with MTL for material definitions
     *    (note that textures in the MTL must be supplied in JPEG or PNG format).
     * 
     * @memberof shf3d
     * @property {bool} autoNormals - (default: `false`) If ´true`, the model's normal vectors are replaced by auto-generated normal vectors. Use this if the shading of the model seems wrong.
     * @property {bool} clockWise - (default: `false`) If `true`, the model's
     *                              surfaces are considered to be defined in
     *                              clockwise order.
     * @property {string} source - The URL of the source file to load. Referenced MTL files and textures are fetched automatically.
     */
    exports.ObjectModel = class ObjectModel extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                info: null,
                clockWise: false,
                autoNormals: false,
                source: "",
                material: new solidMtl.SolidMaterial()
            });
            
            d.get(this).material.color = [1, 0, 0];

            this.notifyable("clockWise");
            this.notifyable("autoNormals");
            this.notifyable("source");
                       
            this.schedule((gl) =>
            {
                this.initGl(gl);
            });
        }

        get clockWise() { return d.get(this).clockWise; }
        set clockWise(cw)
        {
            d.get(this).clockWise = cw;
            this.clockWiseChanged();
        }

        get autoNormals() { return d.get(this).autoNormals; }
        set autoNormals(n)
        {
            d.get(this).autoNormals = n;
            this.autoNormalsChanged();
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            d.get(this).source = s;
            this.sourceChanged();

            fetch(d.get(this).source)
            .then(response => response.text())
            .then((data) => 
            {
                if (s.toLowerCase().endsWith(".obj"))
                {
                    this.load("obj", data, s);
                }
                else
                {
                    console.error("Unsupported object format: " + s);
                }
            })
            .catch((err) =>
            {
                console.error(`Failed to load model '${s}': ${err}`);
            });
        }

        load(type, data, url)
        {
            const priv = d.get(this);
            const dirname = url.substr(0, url.lastIndexOf("/"));

            if (type === "obj")
            {
                const obj = objParser.parseObj(data);

                // create materials
                obj.material.ranges.map(r => r.name).forEach((name) =>
                {
                    if (! priv.info.material.library[name])
                    {
                        const mtl = new solidMtl.SolidMaterial();
                        mtl.parent = this;
                        mtl.color = [1, 1, 1];
                        mtl.shininess = 1;
                        priv.info.material.library[name] = mtl;
                    }
                });

                console.log(priv.info);

                // load material libraries
                obj.material.libraries.forEach((path) =>
                {
                    const mtlUrl = dirname + "/" + path.replace(/\\/g, "/");
                    fetch(mtlUrl)
                    .then(response => response.text())
                    .then(data => this.load("mtl", data, mtlUrl))
                    .catch((err) =>
                    {
                        console.error(`Failed to load material library '${mtlUrl}': ${err}`);
                    });
                });
                this.schedule((gl) => { this.buildMesh(gl, obj); });
            }
            else if (type === "mtl")
            {
                const mtl = objParser.parseMtl(data);

                // populate materials
                mtl.materials.forEach((entry) =>
                {
                    const mtl = priv.info.material.library[entry.name];
                    if (mtl)
                    {
                        console.log("set material color on " + entry.name);
                        // set properties on material
                        mtl.color = entry.kd;
                        mtl.shininess = entry.ns;

                        if (entry.kdMap !== "")
                        {
                            mtl.source = dirname + "/" + entry.kdMap.replace(/\\/g, "/");
                        }
                        if (entry.bumpMap !== "")
                        {
                            mtl.bumpMap = dirname + "/" + entry.bumpMap.replace(/\\/g, "/");
                        }
                    }
                });

                this.invalidate();
            }
        }

        initGl(gl)
        {
            const priv = d.get(this);       

            priv.info = {
                buffer: {
                    vertex: gl.createBuffer(),
                    normal: gl.createBuffer(),
                    tangent: gl.createBuffer(),
                    texture: gl.createBuffer()
                },
                numVertices: 0,
                numSurfaces: 12,
                material: {
                    library: { },
                    ranges: []
                }
            };
        }

        buildMesh(gl, obj)
        {
            const priv = d.get(this);

            const vertices = [];
            const texAnchors = [];
            const normalVertices = [];
            const tangents = [];

            obj.surfaces.forEach((sfc) =>
            {
                if (priv.clockWise)
                {
                    // flip vertices to make surface counter-clockwise
                    const tmp = sfc[2];
                    sfc[2] = sfc[1];
                    sfc[1] = tmp;
                }

                const p1 = obj.v[sfc[0].v];
                const p2 = obj.v[sfc[1].v];
                const p3 = obj.v[sfc[2].v];
                
                let autoNormal = [0, 0, 0];
                if (sfc[0].vn === -1 || priv.autoNormals)
                {
                    // supply auto-normals if desired or the model defines none
                    autoNormal = util.surfaceNormal(p1, p2, p3);                    
                }

                let tangent = [0, 0, 0];
                if (sfc[0].vt !== -1)
                {
                    const uv1 = obj.vt[sfc[0].vt];
                    const uv2 = obj.vt[sfc[1].vt];
                    const uv3 = obj.vt[sfc[2].vt];

                    tangent = util.surfaceTangent(p1, p2, p3, uv1, uv2, uv3);
                }

                sfc.forEach((tuple) =>
                {
                    const vertex = obj.v[tuple.v].slice(0, 3);
                    const normalVertex = tuple.vn !== -1 && ! priv.autoNormals ? obj.vn[tuple.vn].slice(0, 3)
                                                                               : autoNormal;
                    const texAnchor = tuple.vt !== -1 ? obj.vt[tuple.vt].slice(0, 2)
                                                      : [0, 0];

                    vertices.push(...vertex);
                    normalVertices.push(...normalVertex);
                    tangents.push(...tangent);
                    texAnchors.push(...texAnchor);
                });
            });

            console.log("Vertices:");
            console.log(vertices);

            console.log("Texture Anchors:");
            console.log(texAnchors);

            console.log("Tangents:");
            console.log(tangents);

            //console.log("normals " + priv.source);
            //console.log(normalVertices);
            //console.log(constructedNormals);

            priv.info.numVertices = vertices.length / 3;
            priv.info.material.ranges = obj.material.ranges.filter(r => r.to !== -1);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.vertex);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            //console.log(JSON.stringify(vertices));

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.normal);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalVertices), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.tangent);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.texture);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texAnchors), gl.STATIC_DRAW);

            priv.material.apply(gl, priv.info);
        }

        renderScene(gl, om, sceneInfo)
        {
            const priv = d.get(this);

            this.prepare(gl);

            if (! priv.info || priv.info.numVertices === 0)
            {
                return;
            }
           
            // divide into materials
            priv.info.material.ranges.forEach((range) =>
            {
                const mtl = priv.info.material.library[range.name];
                if (mtl)
                {
                    //console.log("mtl " + range.name);
                    mtl.bind(gl,
                             m4.multiply(om, this.matrix),
                             sceneInfo,
                             priv.info);
                    gl.drawArrays(gl.TRIANGLES, range.from * 3, (range.to - range.from + 1) * 3);
                }
            });
        }
    };
});