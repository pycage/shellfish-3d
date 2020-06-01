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

shRequire([__dirname + "/entity.js", __dirname + "/util/m4.js"], (entity, m4) =>
{
    const d = new WeakMap();

    exports.Camera = class Camera extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                aspect: 1,
                fieldOfView: 45,
                projection: "perspective"
            });

            this.notifyable("aspect");
            this.notifyable("fieldOfView");
            this.notifyable("projection");
        }

        get aspect() { return d.get(this).aspect; }
        set aspect(a)
        {
            d.get(this).aspect = a;
            this.aspectChanged();
            this.invalidate();
        }

        get fieldOfView() { return d.get(this).fieldOfView; }
        set fieldOfView(v)
        {
            d.get(this).fieldOfView = v;
            this.fieldOfViewChanged();
            this.invalidate();
        }

        get projection() { return d.get(this).projection; }
        set projection(p)
        {
            d.get(this).projection = p;
            this.projectionChanged();
            this.invalidate();
        }

        get matrix()
        {
            return m4.multiply(
                m4.multiply(
                    m4.rotation(-this.xRotation, -this.yRotation, -this.zRotation),
                    m4.translation(-this.x, -this.y, -this.z)
                ),
                m4.scaling(this.xScale, this.yScale, this.zScale)
            );
        }

        prepareScene(om, sceneInfo)
        {
            if (sceneInfo.activeCamera === this)
            {
                const priv = d.get(this);
                const projectionMatrix = priv.projection === "perspective" 
                                         ? m4.perspective(priv.fieldOfView, priv.aspect, 1, 100)
                                         : m4.orthographic(-10, 10, -10, 10, -10, 10);
    
                sceneInfo.viewMatrix = m4.multiply(
                    projectionMatrix,
                    m4.multiply(m4.inverse(om), this.matrix)
                );
            }
        }
    };
});
