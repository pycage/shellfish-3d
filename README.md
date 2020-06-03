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

        camera: cam

        scene: s3d.Group {

            s3d.Camera {
                id: cam
                location: vec3(0, 0, 5)
            }

            s3d.Light {
                location: vec3(5, 10, -1)
                color: rgb(1.0, 0.8, 0.8)
            }

            s3d.Cube {
                location: vec3(1, 0, 1)
                scale: vec3(1, 3, 1)
                rotationAxis: vec3(0, 1, 0)
                rotationAngle: 45

                material: s3d.TextureMaterial { source: "stonewall.png" }
            }
        }
    }
}
```

Combine with Shellfish's `ListModel`, `Repeater`, and `Animation` elements for
really cool stuff.

Compile reusable groups of objects in their own `.shui` files.
