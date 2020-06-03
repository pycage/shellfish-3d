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
    function vec3(x, y, z)
    {
        return {
            x,
            y,
            z,
            length: function () { return vec3Length(this); },
            scale: function (s) { return vec3Scale(this, s); },
            add: function (other) { return vec3Add(this, other); },
            subtract: function (other) { return vec3Subtract(this, other); }
        }
    }

    function vec3Length(v)
    {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    function vec3Scale(v, s)
    {
        return vec3(
            v.x * s,
            v.y * s,
            v.z * s
        );
    }

    function vec3Add(v1, v2)
    {
        return vec3(
            v1.x + v2.x,
            v1.y + v2.y,
            v1.z + v2.z
        );
    }

    function vec3Subtract(v1, v2)
    {
        return vec3(
            v1.x - v2.x,
            v1.y - v2.y,
            v1.z - v2.z
        );
    }

    function vec3Interpolate (v1, v2, x)
    {
        return v1.add(v2.subtract(v1).scale(x));
    }


    const d = new WeakMap();

    /**
     * Base class for entities in the 3D space.
     * 
     * @memberof shf3d
     * @extends mid.Object
     * 
     * @property {vec3} location - (default: `vec3(0, 0, 0)`) The current location.
     * @property {number} rotationAngle - (default: `0`) The rotation angle in degrees.
     * @property {vec3} rotationAxis - (default: `vec3(0, 1, 0)`) The rotation axis. 
     * @property {vec3} scale - (default: `vec3(1, 1, 1)`) The current scale.
     * @property {bool} visible - (default: `true`) Whether the entity is visible.
     */
    exports.Entity = class Entity extends mid.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                scheduledFunctions: [],
                location: this.vec3(0, 0, 0),
                rotationAxis: this.vec3(0, 1, 0),
                rotationAngle: 0,
                rotationQuaternion: [0, 0, 0, 0],
                scale: this.vec3(1, 1, 1),
                visible: true,
                inverseMatrix: m4.identity()
            });

            this.notifyable("location");
            this.notifyable("matrix");
            this.notifyable("visible");
            this.notifyable("rotationAxis");
            this.notifyable("rotationAngle");
            this.notifyable("scale");

            this.transitionable("location", vec3Interpolate);
            this.transitionable("rotationAngle");
            this.transitionable("scale", vec3Interpolate);

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
            const len = priv.rotationAxis.length();
            const normalizedAxis = len !== 0 ? priv.rotationAxis.scale(1 / len)
                                             : priv.rotationAxis;

            priv.rotationQuaternion = [
                c,
                normalizedAxis.x * s,
                normalizedAxis.y * s,
                normalizedAxis.z * s
            ];

            return m4.multiply(
                m4.translation(priv.location.x, priv.location.y, priv.location.z),
                m4.multiply(
                    m4.scaling(priv.scale.x, priv.scale.y, priv.scale.z),
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

        get rotationQuaternion() { return d.get(this).rotationQuaternion; }

        get location() { return d.get(this).location; }
        set location(l)
        {
            if (l)
            {
                d.get(this).location = l;
                this.locationChanged();
                this.matrixChanged();
            }
            else
            {
                throw new Error("Invalid vec3 value.");
            }
        }

        get scale() { return d.get(this).scale; }
        set scale(s)
        {
            if (s)
            {
                d.get(this).scale = s;
                this.scaleChanged();
                this.matrixChanged();
            }
            else
            {
                throw new Error("Invalid vec3 value.");
            }
        }

        /**
         * Creates a 3-component vector.
         * 
         * @memberof shf3d
         * @param {number} x - The X component.
         * @param {number} y - The Y component.
         * @param {number} z - The Z component.
         * @returns {vec3} The vector.
         */
        vec3(x, y, z)
        {
            return vec3(x, y, z);
        }

        /**
         * Schedules a function to be executed with a GL context.
         * 
         * @memberof shf3d.Entity
         * @param {function} f - The function.
         */
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

        /**
         * Moves the entity by the given directional vector.
         * The vector is expected to be in the entity-local coordinate-system.
         * 
         * @memberof shf3d.Entity
         * @param {vec3} dv - The directional vector.
         */
        move(dv)
        {
            const priv = d.get(this);

            const rm = m4.rotationByQuaternion(priv.rotationQuaternion);
            const xv = m4.multiplyVector(rm, [dv.x, 0, 0, 1]);
            const yv = m4.multiplyVector(rm, [0, dv.y, 0, 1]);
            const zv = m4.multiplyVector(rm, [0, 0, dv.z, 1]);

            const delta = util.elementWise(
                util.elementWise(xv, yv, util.PLUS),
                zv,
                util.PLUS
            );

            this.change("location", vec3(
                this.location.x + delta[0],
                this.location.y + delta[1],
                this.location.z + delta[2]
            ));
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