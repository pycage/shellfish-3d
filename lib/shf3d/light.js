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

shRequire([__dirname + "/entity.js", __dirname + "/util/color.js", __dirname + "/util/m4.js"], (entity, colUtil, m4) =>
{
    const d = new WeakMap();

    /**
     * Class representing a light source in a 3D scene.
     * 
     * Scenes without light sources display objects in the ambient only, without
     * highlights or shades.
     * 
     * A scene may use up to 16 light sources.
     * 
     * @memberof shf3d
     * @extends shf3d.Entity
     * @property {color} color - The light color.
     * @property {number} range - The range of the light until 100% fall-off.
     */
    exports.Light = class Light extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                color: colUtil.rgb(1, 1, 1),
                range: 100.0
            });

            this.notifyable("color");
            this.notifyable("range");

            this.transitionable("color", colUtil.colorInterpolate);
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            d.get(this).color = c;
            this.colorChanged();
            this.invalidate();
        }

        get range() { return d.get(this).range; }
        set range(r)
        {
            d.get(this).range = r;
            this.rangeChanged();
            this.invalidate();
        }

        /**
         * Creates a color from RGBA values.
         * 
         * @memberof shf3d
         * @param {number} r - The red value.
         * @param {number} g - The green value.
         * @param {number} b - The blue value.
         * @param {number} a - The alpha value.
         */
        rgba(r, g, b, a) { return colUtil.rgba(r, g, b, a); }
        
        /**
         * Creates a color from RGB values.
         * 
         * @memberof shf3d
         * @param {number} r - The red value.
         * @param {number} g - The green value.
         * @param {number} b - The blue value.
         */
        rgb(r, g, b) { return colUtil.rgb(r, g, b); }

        /**
         * Creates a color from a CSS color name.
         * 
         * @memberof shf3d
         * @param {string} name - The color name.
         */
        colorName(name) { return colUtil.color(name); }

        prepareScene(om, sceneInfo)
        {
            const v = m4.multiplyVector(m4.multiply(om, this.matrix), [0, 0, 0, 1]);
            //const v = [this.x, this.y, this.z, 1];
            //console.log("Light at " + v);
            sceneInfo.lights.push({
                x: v[0],
                y: v[1],
                z: v[2],
                color: this.color,
                range: this.range
            });
        }
    };
});
