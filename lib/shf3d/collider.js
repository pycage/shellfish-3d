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

    /**
     * Class representing a collider vertex that detects collisions with other
     * entities.
     * 
     * @memberof shf3d
     * @extends shf3d.Entity
     * 
     * @property {shf3d.Entity[]} collisions - [readonly] The entities that the collider currently collides with.
     */
    exports.Collider = class Collider extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                collisions: []
            });

            this.notifyable("collisions");
        }

        get collisions() { return d.get(this).collisions; }

        collide(objs)
        {
            d.get(this).collisions = objs;
            this.collisionsChanged();
        }

        prepareScene(om, sceneInfo)
        {
            const v = m4.multiplyVector(om, [this.location.x, this.location.y, this.location.z, 1]);
            //console.log("put collider at " + JSON.stringify(v));
            sceneInfo.colliders.push({
                vertex: v,
                target: this
            });
        }
    };
});
