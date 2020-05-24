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

    exports.Camera = class Camera extends mid.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                aspect: 1,
                fieldOfView: 45,
                projection: "perspective",
                x: 0,
                y: 0,
                z: 0
            });

            this.notifyable("aspect");
            this.notifyable("fieldOfView");
            this.notifyable("matrix");
            this.notifyable("projection");
            this.notifyable("x");
            this.notifyable("y");
            this.notifyable("z");
        }

        get matrix()
        {
            const priv = d.get(this);
            return m4.multiply(
                m4.translation(priv.x, priv.y, priv.z),
                priv.projection === "perspective" ? m4.perspective(priv.fieldOfView, priv.aspect, 1, 100)
                                                  : m4.orthographic(-10, 10, -10, 10, -10, 10)
            );
        }

        get aspect() { return d.get(this).aspect; }
        set aspect(a)
        {
            d.get(this).aspect = a;
            this.aspectChanged();
            this.matrixChanged();
        }

        get fieldOfView() { return d.get(this).fieldOfView; }
        set fieldOfView(v)
        {
            d.get(this).fieldOfView = v;
            this.fieldOfViewChanged();
            this.matrixChanged();
        }

        get projection() { return d.get(this).projection; }
        set projection(p)
        {
            d.get(this).projection = p;
            this.projectionChanged();
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

    };
});
