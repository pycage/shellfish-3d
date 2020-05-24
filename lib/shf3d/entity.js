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

shRequire(["shellfish/mid", __dirname + "/util/m4.js"], (mid, m4) =>
{
    const d = new WeakMap();

    exports.Entity = class Entity extends mid.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                scheduledFunctions: [],
                x: 0,
                y: 0,
                z: 0,
                rx: 0,
                ry: 0,
                rz: 0,
                sx: 1,
                sy: 1,
                sz: 1,
                visible: true
            });

            this.notifyable("matrix");
            this.notifyable("visible");
            this.notifyable("xRotation");
            this.notifyable("yRotation");
            this.notifyable("zRotation");
            this.notifyable("xScale");
            this.notifyable("yScale");
            this.notifyable("zScale");
            this.notifyable("x");
            this.notifyable("y");
            this.notifyable("z");

            this.transitionable("matrix");
            this.transitionable("xRotation");
            this.transitionable("yRotation");
            this.transitionable("zRotation");
            this.transitionable("xScale");
            this.transitionable("yScale");
            this.transitionable("zScale");
            this.transitionable("x");
            this.transitionable("y");
            this.transitionable("z");

            this.registerEvent("invalidate");

            this.onMatrixChanged = () => { this.invalidate(); };
        }

        get visible() { return d.get(this).visible; }
        set visible(v)
        {
            d.get(this).visible = v;
            this.visibleChanged();
            this.invalidate();
        }

        get matrix()
        {
            const priv = d.get(this);
            return m4.multiply(
                m4.multiply(
                    m4.translation(priv.x, priv.y, priv.z),
                    m4.rotation(priv.rx, priv.ry, priv.rz)
                ),
                m4.scaling(priv.sx, priv.sy, priv.sz)
            );
        }

        get xRotation() { return d.get(this).rx; }
        set xRotation(v)
        {
            d.get(this).rx = v;
            this.xRotationChanged();
            this.matrixChanged();
        }

        get yRotation() { return d.get(this).ry; }
        set yRotation(v)
        {
            d.get(this).ry = v;
            this.yRotationChanged();
            this.matrixChanged();
        }

        get zRotation() { return d.get(this).rz; }
        set zRotation(v)
        {
            d.get(this).rz = v;
            this.zRotationChanged();
            this.matrixChanged();
        }

        get xScale() { return d.get(this).sx; }
        set xScale(v)
        {
            d.get(this).sx = v;
            this.xScaleChanged();
            this.matrixChanged();
        }

        get yScale() { return d.get(this).sy; }
        set yScale(v)
        {
            d.get(this).sy = v;
            this.yScaleChanged();
            this.matrixChanged();
        }

        get zScale() { return d.get(this).sz; }
        set zScale(v)
        {
            d.get(this).sz = v;
            this.zScaleChanged();
            this.matrixChanged();
        }

        get x() { return d.get(this).x; }
        set x(v)
        {
            d.get(this).x = v;
            this.xChanged();
            this.matrixChanged();
        }

        get y() { return d.get(this).y; }
        set y(v)
        {
            d.get(this).y = v;
            this.yChanged();
            this.matrixChanged();
        }
 
        get z() { return d.get(this).z; }
        set z(v)
        {
            d.get(this).z = v;
            this.zChanged();
            this.matrixChanged();
        }

        schedule(f)
        {
            d.get(this).scheduledFunctions.push(f);
        }

        prepare(gl)
        {
            d.get(this).scheduledFunctions.forEach((f) =>
            {
                f(gl);
            });
            d.get(this).scheduledFunctions = [];
        }

        prepareScene(om, sceneInfo)
        {
            // no action by default
        }

        renderScene(gl, om, sceneInfo)
        {
            // no action by default
        }
    };
});