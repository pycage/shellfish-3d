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

shRequire([__dirname + "/entity.js", __dirname + "/util/util.js", __dirname + "/util/m4.js"], (entity, util, m4) =>
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
    
    const TEX_COORDS = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
    ];
    
    const SURFACES = util.makeRectSurface(VERTICES, 0, 1, 2, 3)
    .concat(util.makeRectSurface(VERTICES, 4, 5, 1, 0))
    .concat(util.makeRectSurface(VERTICES, 1, 5, 6, 2))
    .concat(util.makeRectSurface(VERTICES, 3, 2, 6, 7))
    .concat(util.makeRectSurface(VERTICES, 4, 0, 3, 7))
    .concat(util.makeRectSurface(VERTICES, 5, 4, 7, 6));
    
    const TEX_SURFACES = util.makeRectSurface(TEX_COORDS, 0, 1, 2, 3)
    .concat(util.makeRectSurface(TEX_COORDS, 0, 1, 2, 3))
    .concat(util.makeRectSurface(TEX_COORDS, 0, 1, 2, 3))
    .concat(util.makeRectSurface(TEX_COORDS, 0, 1, 2, 3))
    .concat(util.makeRectSurface(TEX_COORDS, 0, 1, 2, 3))
    .concat(util.makeRectSurface(TEX_COORDS, 0, 1, 2, 3));
    
    const d = new WeakMap();

    exports.CubeMesh = class CubeMesh extends entity.Entity
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
                this.initGl(gl);
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

        initGl(gl)
        {
            const priv = d.get(this);
            priv.info = {
                buffer: {
                    vertex: gl.createBuffer(),
                    texture: gl.createBuffer(),
                    normal: gl.createBuffer()
                },
                numVertices: 36
            };
        
            let normals = [];
            for (let i = 0; i < SURFACES.length; i += 9)
            {
                const normal = util.surfaceNormal(
                    [SURFACES[i], SURFACES[i + 1], SURFACES[i + 2]],
                    [SURFACES[i + 3], SURFACES[i + 4], SURFACES[i + 5]],
                    [SURFACES[i + 6], SURFACES[i + 7], SURFACES[i + 8]]
                );
                normals = normals.concat(normal);
                normals = normals.concat(normal);
                normals = normals.concat(normal);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.vertex);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(SURFACES), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.texture);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(TEX_SURFACES), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.normal);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        }

        renderScene(gl, om, sceneInfo)
        {
            const priv = d.get(this);

            if (! priv.material)
            {
                console.error(`${this.constructor.name} (${this.objectLocation}) has no material.`);
                return;
            }

            this.prepare(gl);

            priv.material.bind(gl,
                               m4.multiply(om, this.matrix),
                               sceneInfo,
                               priv.info);
            
            gl.drawArrays(gl.TRIANGLES, 0, priv.info.numVertices);
        }
    };
});