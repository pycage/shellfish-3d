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

shRequire([__dirname + "/mesh.js",
           __dirname + "/material.js",
           __dirname + "/util/objparser.js"], (mesh, solidMtl, objParser) =>
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
     * @property {string} source - The URL of the source file to load. Referenced MTL files and textures are fetched automatically.
     */
    exports.ObjectModel = class ObjectModel extends mesh.Mesh
    {
        constructor()
        {
            super();
            d.set(this, {
                autoNormals: false,
                source: "",
                materials: { }
            });
            
            this.notifyable("autoNormals");
            this.notifyable("source");                       
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

            console.log("Loaded model from: " + url);

            if (type === "obj")
            {
                const obj = objParser.parseObj(data);

                // create materials
                console.log(obj);
                obj.material.ranges.filter(r => r.to !== -1).forEach((r) =>
                {
                    if (! priv.materials[r.name])
                    {
                        const mtl = new solidMtl.Material();
                        mtl.parent = this;
                        mtl.color = [1, 1, 1];
                        mtl.shininess = 1;
                        priv.materials[r.name] = mtl;
                    }
                    this.assignMaterial(priv.materials[r.name], r.from, r.to);
                });

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
                this.schedule((gl) =>
                {
                    const surfaces = obj.surfaces.map((s) =>
                    {
                        return s.map((vertex) =>
                        {
                            return {
                                vertex: vertex.v,
                                normal: priv.autoNormals ? -1 : vertex.vn,
                                texture: vertex.vt
                            };
                        });
                    });
                    this.buildMesh(gl,
                                   obj.v,
                                   obj.vn,
                                   obj.vt,
                                   surfaces);
                });
                this.invalidate();
            }
            else if (type === "mtl")
            {
                const mtl = objParser.parseMtl(data);

                // populate materials
                mtl.materials.forEach((entry) =>
                {
                    const mtl = priv.materials[entry.name];
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
    };
});