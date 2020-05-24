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
    
    exports.ObjectModel = class ObjectModel extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                info: null,
                source: "",
                material: new solidMtl.SolidMaterial()
            });
            
            d.get(this).material.color = [1, 0, 0];

            this.notifyable("source");
                       
            this.schedule((gl) =>
            {
                this.initGl(gl);
            });
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
                    this.load("obj", data);
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

        load(type, data)
        {
            const priv = d.get(this);

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
                    fetch(path)
                    .then(response => response.text())
                    .then(data => this.load("mtl", data))
                    .catch((err) =>
                    {
                        console.error(`Failed to load material library '${path}': ${err}`);
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
                            mtl.source = entry.kdMap;
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
                    texture: gl.createBuffer(),
                    normal: gl.createBuffer()
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
            const texVertices = [];
            const normalVertices = [];
            const constructedNormals = [];
            obj.surfaces.forEach((sfc) =>
            {
                const p1 = obj.v[sfc[0].v];
                const p2 = obj.v[sfc[1].v];
                const p3 = obj.v[sfc[2].v];
                const n = util.surfaceNormal(p1, p2, p3);
                constructedNormals.push(...n);
                constructedNormals.push(...n);
                constructedNormals.push(...n);

                if (obj.vn[sfc[0].vn])
                {
                    const vn = obj.vn[sfc[0].vn];
                    if (n[0] * vn[0] + n[1] * vn[1] + n[2] * vn[2] < 0)
                    {
                        // flip vertices to make face clockwise
                        const tmp = sfc[2];
                        sfc[2] = sfc[1];
                        sfc[1] = tmp;
                    }
                }

                sfc.forEach((tuple) =>
                {
                    const vertex = obj.v[tuple.v].slice(0, 3);
                    const normalVertex = obj.vn.length > 0 ? obj.vn[tuple.vn].slice(0, 3) : [0, 0, 0];
                    const texVertex = obj.vt.length > 0 ? obj.vt[tuple.vt].slice(0, 2) : [0, 0];

                    vertices.push(...vertex);
                    normalVertices.push(...normalVertex);
                    texVertices.push(...texVertex);
                });
            });

            console.log("normals " + priv.source);
            console.log(normalVertices);
            console.log(constructedNormals);

            priv.info.numVertices = vertices.length / 3;
            priv.info.material.ranges = obj.material.ranges.slice();

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.vertex);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.normal);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(/*normalVertices*/constructedNormals), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.texture);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texVertices), gl.STATIC_DRAW);

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
                             m4.multiply(this.matrix, om),
                             sceneInfo,
                             priv.info);
                    gl.drawArrays(gl.TRIANGLES, range.from * 3, (range.to - range.from) * 3);
                }
            });
        }
    };
});