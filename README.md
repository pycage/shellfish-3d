# 3D elements for use with Shellfish

Shellfish-3D puts fun into Web-GL programming!

Render objects into a view. Write Shui code like this:

```
require "shellfish/ui";
require "shf3d.js" as s3d;

Page {
    s3d.View {
        fillWidth: true
        height: documentRoot.height
        originalWidth: bbox.width
        originalHeight: bbox.height

        camera: s3d.Camera {
            z: -5
        }

        scene: s3d.Group {

            s3d.Light {
                x: 5
                y: 10
                z: -1
                color: [1.0, 0.8, 0.8]
            }

            s3d.CubeMesh {
                x: 1
                z: 1
                yScale: 3
                zRotation: 45

                material: s3d.TextureMaterial { source: "stonewall.png" }
            }
        }
    }
}
```

Combine with `ListModel`, `Repeater`, and `Animation` elements for really cool stuff.

Compile reusable groups of objects in their own `.shui` files.
