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

shRequire([__dirname + "/mesh.js", __dirname + "/util/util.js", __dirname + "/util/m4.js"], (mesh, util, m4) =>
{      
    /*
        4------5
      / |    / |
    0------1   |
    |   |  |   |
    |   7--|---6
    | /    | /
    3------2
    */
   const VERTICES = [
       [-0.5, 0.5, 0.5],
       [0.5, 0.5, 0.5],
       [0.5, -0.5, 0.5],
       [-0.5, -0.5, 0.5],
       [-0.5, 0.5, -0.5],
       [0.5, 0.5, -0.5],
       [0.5, -0.5, -0.5],
       [-0.5, -0.5, -0.5]
    ];
    
    const TEX_ANCHORS = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
    ];
    
    const SURFACES = util.rectSurfaces([0, 1, 2, 3], [], [0, 1, 2, 3])
                     .concat(util.rectSurfaces([4, 5, 1, 0], [], [0, 1, 2, 3]))
                     .concat(util.rectSurfaces([1, 5, 6, 2], [], [0, 1, 2, 3]))
                     .concat(util.rectSurfaces([3, 2, 6, 7], [], [0, 1, 2, 3]))
                     .concat(util.rectSurfaces([4, 0, 3, 7], [], [0, 1, 2, 3]))
                     .concat(util.rectSurfaces([5, 4, 7, 6], [], [0, 1, 2, 3]));
                     
    
    const d = new WeakMap();

    exports.CubeMesh = class CubeMesh extends mesh.Mesh
    {
        constructor()
        {
            super();
            d.set(this, {
                info: null,
                material: null
            });

            this.notifyable("material");

            this.onMaterialChanged = () => { this.invalidate(); };

            this.schedule((gl) =>
            {
                this.buildMesh(gl, VERTICES, [], TEX_ANCHORS, SURFACES);
            });
        }

        get material() { return d.get(this).material; }
        set material(m)
        {
            if (d.get(this).material)
            {
                d.get(this).material.disconnect("invalidate", this);
            }
            d.get(this).material = m;
            m.init();
            this.assignMaterial(m, 0, 11);
            
            this.schedule((gl) => { m.initGl(gl); });
            
            const apply = () =>
            {
                this.schedule((gl) =>
                {
                    m.apply(gl, d.get(this).info);
                });
            };
            
            apply();
            m.connect("invalidate", this, apply);
            
            this.materialChanged();
        }

    };
});