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

shRequire(["shellfish/low", "shellfish/mid", __dirname + "/util/m4.js"], (low, mid, m4) =>
{
    const d = new WeakMap();

    /**
     * Class representing a view displaying a 3D scene.
     */
    exports.View = class View extends mid.Canvas
    {
        constructor()
        {
            super();
            d.set(this, {
                renderPending: false,
                gl: this.get().getContext("webgl"),
                ambience: [0, 0, 0],
                color: [0, 0, 0],
                camera: null,
                scene: null
            });

            this.notifyable("ambience");
            this.notifyable("camera");
            this.notifyable("color");
            this.notifyable("scene");

            const priv = d.get(this);
            const gl = priv.gl;

            gl.enable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);

            this.onInitialization = () =>
            {
                if (priv.scene)
                {
                    priv.scene.init();
                    this.invalidateScene();
                }
            }

            this.onOriginalWidthChanged = () =>
            {
                this.invalidateScene();
            };

            this.onOriginalHeightChanged = () =>
            {
                this.invalidateScene();
            };
        }

        get ambience() { return d.get(this).ambience; }
        set ambience(a)
        {
            d.get(this).ambience = a;
            this.ambienceChanged();
            this.invalidateScene();
        }

        get camera() { return d.get(this).camera; }
        set camera(c)
        {
            if (d.get(this).camera)
            {
                d.get(this).camera.disconnect("matrixChanged", this);
            }

            d.get(this).camera = c;
            if (c && ! c.parent)
            {
                c.parent = this;
            }
            this.cameraChanged();
            this.invalidateScene();
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            d.get(this).color = c;
            this.colorChanged();
            this.invalidateScene();
        }

        get scene() { return d.get(this).scene; }
        set scene(s)
        {
            if (d.get(this).scene)
            {
                d.get(this).scene.disconnect("invalidate", this);
            }
            d.get(this).scene = s;
            if (! s.parent)
            {
                s.parent = this;
            }
            this.sceneChanged();

            s.connect("invalidate", this, () => { this.invalidateScene(); });
        }

        invalidateScene()
        {
            const priv = d.get(this);
            if (! priv.renderPending)
            {
                priv.renderPending = true;
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.renderScene();
                    priv.renderPending = false;
                });
            }
        }

        renderScene()
        {
            //console.log("render scene into " + this.objectLocation);
            const priv = d.get(this);

            if (! priv.scene || ! priv.camera)
            {
                return;
            }

            const gl = priv.gl;

            gl.clearColor(priv.color[0], priv.color[1], priv.color[2], 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.viewport(0, 0, this.originalWidth, this.originalHeight);

            if (priv.scene && priv.scene.visible)
            {
                const sceneInfo = {
                    activeCamera: priv.camera,
                    viewMatrix: m4.identity(),
                    ambience: priv.ambience,
                    lights: [],
                    colliders: []
                };
                priv.scene.prepareScene(m4.scaling(1, 1, 1), sceneInfo);
                
                sceneInfo.colliders.forEach((entry) =>
                {
                    const objs = priv.scene.collisionsWith(entry.vertex);
                    entry.target.collide(objs);
                });
                
                priv.scene.renderScene(gl, m4.scaling(1, 1, 1), sceneInfo);
            }

            this.children.filter(c => c !== priv.scene && c.renderScene).forEach((obj) =>
            {
                //console.log("child: " + obj.constructor.name);
                obj.renderScene(gl);
            });
        }

        add(child)
        {
            if (child.invalidateScene)
            {
                child.connect("invalidateScene", this, () =>
                {
                    this.invalidateScene();
                });
            }
            child.parent = this;
        }
    };
});
