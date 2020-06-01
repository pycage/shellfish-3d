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

shRequire(["shellfish/mid", __dirname + "/util/util.js", __dirname + "/util/m4.js"], (mid, util, m4) =>
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
                sx: 1,
                sy: 1,
                sz: 1,
                rotationAxis: [0, 1, 0],
                rotationAngle: 0,
                rotationQuaternion: [0, 0, 0, 0],
                visible: true,
                inverseMatrix: m4.identity()
            });

            this.notifyable("matrix");
            this.notifyable("visible");
            this.notifyable("rotationAxis");
            this.notifyable("rotationAngle");
            this.notifyable("xScale");
            this.notifyable("yScale");
            this.notifyable("zScale");
            this.notifyable("x");
            this.notifyable("y");
            this.notifyable("z");

            this.transitionable("matrix");
            this.transitionable("rotationAngle");
            this.transitionable("xScale");
            this.transitionable("yScale");
            this.transitionable("zScale");
            this.transitionable("x");
            this.transitionable("y");
            this.transitionable("z");

            this.registerEvent("invalidate");

            this.onMatrixChanged = () =>
            {
                d.get(this).inverseMatrix = m4.inverse(this.matrix);
                this.invalidate();
            };
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

            const phi = priv.rotationAngle / 180 * Math.PI;
            const c = Math.cos(phi / 2);
            const s = Math.sin(phi / 2);
            const len = util.vectorLength(priv.rotationAxis);
            const normalizedAxis = priv.rotationAxis.map(a => a / len);

            priv.rotationQuaternion = [
                c,
                normalizedAxis[0] * s,
                normalizedAxis[1] * s,
                normalizedAxis[2] * s
            ];

            return m4.multiply(
                m4.translation(priv.x, priv.y, priv.z),
                m4.multiply(
                    m4.scaling(priv.sx, priv.sy, priv.sz),
                    m4.rotationByQuaternion(priv.rotationQuaternion)
                )
            );
        }

        get inverseMatrix() { return d.get(this).inverseMatrix; }

        get rotationAxis() { return d.get(this).rotationAxis; }
        set rotationAxis(a)
        {
            d.get(this).rotationAxis = a;
            this.rotationAxisChanged();
            this.matrixChanged();
        }

        get rotationAngle() { return d.get(this).rotationAngle; }
        set rotationAngle(a)
        {
            d.get(this).rotationAngle = a;
            this.rotationAngleChanged();
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

        move(dx, dy, dz)
        {
            const priv = d.get(this);

            const rm = m4.rotationByQuaternion(priv.rotationQuaternion);
            const xv = m4.multiplyVector(rm, [dx, 0, 0, 1]);
            const yv = m4.multiplyVector(rm, [0, dy, 0, 1]);
            const zv = m4.multiplyVector(rm, [0, 0, dz, 1]);

            const delta = util.elementWise(
                util.elementWise(xv, yv, util.PLUS),
                zv,
                util.PLUS
            );

            this.x += delta[0];
            this.y += delta[1];
            this.z += delta[2];
        }

        collisionsWith(v)
        {
            return [];
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