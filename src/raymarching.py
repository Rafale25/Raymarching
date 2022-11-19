# import logging
# from array import array
from pathlib import Path
from collections import defaultdict

import imgui
import moderngl

import moderngl_window
from moderngl_window import geometry
from moderngl_window.opengl.vao import VAO
# from moderngl_window.integrations.imgui import ModernglWindowRenderer

from moderngl_window.scene.camera import KeyboardCamera

import glm
from glm import vec3
from math import pi, cos, sin

from .FpsCounter import FpsCounter

class MyWindow(moderngl_window.WindowConfig):
    title = 'RayMarching'
    gl_version = (4, 3)
    window_size = (1280, 720)
    fullscreen = False
    resizable = True
    vsync = True
    resource_dir = (Path(__file__) / "../../assets").resolve()
    # log_level = logging.ERROR

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # self.ctx.gc_mode = "auto"

        self.pause = False

        ## Debug
        self.key = defaultdict(bool)

        self.fps_counter = FpsCounter()
        # self.debug_values = {}
        # self.query = self.ctx.query(samples=False, time=True)

        ## ImGui --
        # imgui.create_context()
        # self.imgui = ModernglWindowRenderer(self.wnd)


        self.camera_position = vec3(0, 0, 0)
        self.camera_rot = vec3(0, 0, 0)


        self.program = {
            'RAYMARCH':
                self.load_program(
                    vertex_shader='./raymarch.vert',
                    fragment_shader='./raymarch.frag'),
        }

        self.quadfs = moderngl_window.geometry.quad_fs()


    def update(self, time_since_start, dt):
        self.fps_counter.update(dt)

        dy = self.key[self.wnd.keys.E] - self.key[self.wnd.keys.Q]
        dx = self.key[self.wnd.keys.A] - self.key[self.wnd.keys.D]
        dz = self.key[self.wnd.keys.W] - self.key[self.wnd.keys.S]

        self.camera_position.x -= cos(self.camera_rot.y) * dx
        self.camera_position.z -= sin(self.camera_rot.y) * dx

        self.camera_position.x += cos(self.camera_rot.y + pi/2) * dz
        self.camera_position.z += sin(self.camera_rot.y + pi/2) * dz

        self.camera_position.y += dy * 1.0

        rotx = glm.rotate(glm.mat4(1.0), self.camera_rot.x, vec3(1, 0, 0))
        roty = glm.rotate(glm.mat4(1.0), self.camera_rot.y, vec3(0, 1, 0))
        rotz = glm.rotate(glm.mat4(1.0), self.camera_rot.z, vec3(0, 0, 1))
        rot = rotx * roty * rotz

        self.program['RAYMARCH']['camera_rotation_matrix'].write(rot)
        self.program['RAYMARCH']['camera_position'].write(self.camera_position)

    def render(self, time_since_start, frametime):
        self.update(time_since_start, frametime)

        self.ctx.clear()
        # self.ctx.enable_only(moderngl.CULL_FACE | moderngl.DEPTH_TEST)

        self.program['RAYMARCH']['u_resolution'] = self.window_size
        self.quadfs.render(program=self.program['RAYMARCH'])

        # self.ctx.wireframe = False
        # self.ctx.disable(moderngl.DEPTH_TEST)
        # self.gui_newFrame()
        # self.gui_draw()


    def key_event(self, key, action, modifiers):
        self.key[key] = action == self.wnd.keys.ACTION_PRESS

    def mouse_drag_event(self, x, y, dx, dy):
        self.camera_rot.y += dx * 0.001
        self.camera_rot.x += dy * 0.001

    def mouse_position_event(self, x, y, dx, dy):
        pass


    def gui_newFrame(self):
        imgui.new_frame()

        imgui.text("fps: {:.2f}".format(self.fps_counter.get_fps()))
        for query, value in self.debug_values.items():
            imgui.text("{}: {:.3f} ms".format(query, value))

        changed, state = imgui.checkbox("Fullscreen", self.wnd.fullscreen)
        if changed:
            self.wnd.fullscreen = state

        changed, state = imgui.checkbox("Vsync", self.wnd._window.vsync)
        if changed:
            self.wnd._window.set_vsync(state)
        changed, state = imgui.checkbox("Vsync", self.wnd.vsync)
        if changed:
            self.wnd.vsync = state

        imgui.set_window_font_scale(2.0)
        imgui.end()

    def gui_draw(self):
        imgui.render()
        self.imgui.render(imgui.get_draw_data())

