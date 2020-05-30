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

shRequire([__dirname + "/mesh.js", __dirname + "/util/util.js"], (mesh, util) =>
{      
                     
    
    const d = new WeakMap();

    exports.HeightMesh = class HeightMesh extends mesh.Mesh
    {
        constructor()
        {
            super();
            d.set(this, {
                material: null,
                source: "",
                columns: 100,
                rows: 100,
                vertices: [],
                texAnchors: [],
                surfaces: []
            });

            this.notifyable("material");
            this.notifyable("source");

            this.onMaterialChanged = () => { this.invalidate(); };

            this.schedule((gl) =>
            {
                const priv = d.get(this);
                const vertices = [];
                const texAnchors = [];
                const surfaces = [];

                for (let row = 0; row < priv.rows; ++row)
                {
                    for (let col = 0; col < priv.columns; ++col)
                    {
                        vertices.push([col / priv.columns - 0.5, 0, row / priv.rows - 0.5]);
                        texAnchors.push([col / priv.columns, row / priv.rows]);

                        if (row > 0 && col > 0)
                        {
                            const p1 = (row - 1) * priv.columns + (col - 1);
                            const p2 = (row - 1) * priv.columns + col;
                            const p3 = row * priv.columns + col;
                            const p4 = row * priv.columns + (col - 1);
                            surfaces.push(...util.rectSurfaces(
                                [p1, p2, p3, p4],
                                [],
                                [p1, p2, p3, p4]
                            ));
                        }
                    }
                }

                priv.vertices = vertices;
                priv.texAnchors = texAnchors;
                priv.surfaces = surfaces;
                this.buildMesh(gl, vertices, [], texAnchors, surfaces.slice());
            });
        }

        get material() { return d.get(this).material; }
        set material(m)
        {
            const priv = d.get(this);
            if (priv.material)
            {
                priv.material.disconnect("invalidate", this);
            }
            priv.material = m;
            if (! m.parent)
            {
                m.parent = this;
            }
            
            this.assignMaterial(m, 0,  (priv.rows - 1) * (priv.columns - 1) * 2);           
            m.connect("invalidate", this, () => { this.invalidate(); });
            
            this.materialChanged();
            this.invalidate();
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            const priv = d.get(this);
            priv.source = s;
            this.sourceChanged();

            const img = new Image();
            img.onload = () =>
            {
                this.schedule((gl) =>
                {
                    const cnv = document.createElement("canvas");
                    cnv.width = priv.columns;
                    cnv.height = priv.rows;
                    const ctx = cnv.getContext("2d");
                    ctx.drawImage(img, 0, 0, cnv.width, cnv.height);
                    const data = ctx.getImageData(0, 0, priv.columns, priv.rows);
                    
                    for (let row = 0; row < priv.rows; ++row)
                    {
                        for (let col = 0; col < priv.columns; ++col)
                        {
                            const pos = row * priv.columns + col;
                            //console.log(row * priv.columns + col);
                            const pixel = data.data[pos * 4];
                            //console.log(pixel);
                            const v = priv.vertices[pos];
                            v[1] = (pixel / 255.0);
                        }
                    }
                    
                    this.buildMesh(gl, priv.vertices, [], priv.texAnchors, priv.surfaces.slice());
                    this.invalidate();
                });
            };

            img.onerror = (err) =>
            {
                console.error("Failed to load height map: " + s);
            };
            console.log("Loading height map: " + s);
            img.src = s;
        }

    };
});