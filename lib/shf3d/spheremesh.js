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
    function location(longitude, latitude)
    {
        /*
          x = sin(lat) * cos(long)
          y = sin(long)
          z = cos(lat) * cos(long)
        */
        return [Math.sin(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * longitude),
                Math.sin(Math.PI / 180 * longitude),
                Math.cos(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * longitude)];
    }

    function texLocation(longitude, latitude)
    {
        return [latitude / 360.0,
                1.0 - Math.sin(Math.PI / 180 * ((longitude + 90) / 2))];
    }

    
    const d = new WeakMap();
    
    exports.SphereMesh = class SphereMesh extends entity.Entity
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

            let points = [];
            let texCoords = [];
            const stepSize = 12;
            for (let longitude = -90; longitude < 90; longitude += stepSize)
            {
                for (let latitude = 0; latitude < 360; latitude += stepSize)
                {
                    const vs = [
                        location(longitude, latitude),
                        location(longitude + stepSize, latitude),
                        location(longitude + stepSize, latitude + stepSize),
                        location(longitude, latitude + stepSize)
                    ];
                    const ts = [
                        texLocation(longitude, latitude),
                        texLocation(longitude + stepSize, latitude),
                        texLocation(longitude + stepSize, latitude + stepSize),
                        texLocation(longitude, latitude + stepSize)
                    ];
                    points = points.concat(util.makeRectSurface(vs, 0, 1, 2, 3));
                    texCoords = texCoords.concat(util.makeRectSurface(ts, 0, 1, 2, 3));
                }
            }

            let normals = [];
            for (let i = 0; i < points.length; i += 9)
            {
                const normal = util.surfaceNormal(
                    [points[i], points[i + 1], points[i + 2]],
                    [points[i + 3], points[i + 4], points[i + 5]],
                    [points[i + 6], points[i + 7], points[i + 8]]
                );
                normals = normals.concat(normal);
                normals = normals.concat(normal);
                normals = normals.concat(normal);
            }

            priv.info = {
                buffer: {
                    vertex: gl.createBuffer(),
                    color: gl.createBuffer(),
                    texture: gl.createBuffer(),
                    normal: gl.createBuffer()
                },
                numSurfaces: points.length / 9
            };

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.vertex);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.texture);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

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
            
            gl.drawArrays(gl.TRIANGLES, 0, priv.info.numSurfaces * 3);
        }
    };
});