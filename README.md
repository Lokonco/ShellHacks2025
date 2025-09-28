<!-- Improved compatibility of back to top link -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Lokonco/ShellHacks2025">
    <img src="src/renderer/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">PyCAD</h3>

  <p align="center">
    Create 3D Print-ready files using Python scripts
    <br />
    <a href="https://github.com/Lokonco/ShellHacks2025"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Lokonco/ShellHacks2025">View Demo</a>
    ·
    <a href="https://github.com/Lokonco/ShellHacks2025/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    ·
    <a href="https://github.com/Lokonco/ShellHacks2025/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#getting-started">Getting Started</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Screenshot][product-screenshot]](https://github.com/Lokonco/ShellHacks2025)

This project was built during **ShellHacks 2025**. The goal was to make an app that generates 3D-printable object files from Python scripts. This allows makers and hackers to brainstorm 3D print ideas quickly without needing advanced CAD software skills.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* [![Vue][Vue.js]][Vue-url]
* [![Node][Node.js]][Node-url]
* [![Electron][Electron.com]][Electron-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Follow these steps to set up a local copy of **PyCAD**:

### Prerequisites

You’ll need [Node.js](https://nodejs.org/) and npm installed.
```sh
npm install npm@latest -g
```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/Lokonco/ShellHacks2025.git
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Run the app in development mode
   ```sh
   npm run dev
   ```
4. Build the app for production
   ```sh
   npm run build
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

Write Python scripts to define 3D shapes and export them as STL files ready for 3D printing.

```python
# Example: Create a cube
from pycad import Cube, export

shape = Cube(10)  # 10x10x10mm cube
export(shape, "cube.stl")
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] STL export support
- [x] Live 3D preview
- [ ] More geometric primitives
- [ ] Parameterized objects
- [ ] Community script library

See the [open issues](https://github.com/Lokonco/ShellHacks2025/issues) for a full list.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community amazing. Any contributions you make are **greatly appreciated**.

1. Fork the Project  
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)  
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)  
4. Push to the Branch (`git push origin feature/AmazingFeature`)  
5. Open a Pull Request  

### Top contributors:

<a href="https://github.com/Lokonco/ShellHacks2025/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Lokonco/ShellHacks2025" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Project Maintainers – [GitHub](https://github.com/Lokonco/ShellHacks2025)

Project Link: [https://github.com/Lokonco/ShellHacks2025](https://github.com/Lokonco/ShellHacks2025)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [ShellHacks 2025](https://shellhacks.net)
* [Three.js](https://threejs.org/)
* [Pyodide](https://pyodide.org/)
* [Shields.io](https://shields.io)
* [contrib.rocks](https://contrib.rocks)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/Lokonco/ShellHacks2025.svg?style=for-the-badge
[contributors-url]: https://github.com/Lokonco/ShellHacks2025/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Lokonco/ShellHacks2025.svg?style=for-the-badge
[forks-url]: https://github.com/Lokonco/ShellHacks2025/network/members
[stars-shield]: https://img.shields.io/github/stars/Lokonco/ShellHacks2025.svg?style=for-the-badge
[stars-url]: https://github.com/Lokonco/ShellHacks2025/stargazers
[issues-shield]: https://img.shields.io/github/issues/Lokonco/ShellHacks2025.svg?style=for-the-badge
[issues-url]: https://github.com/Lokonco/ShellHacks2025/issues
[license-shield]: https://img.shields.io/github/license/Lokonco/ShellHacks2025.svg?style=for-the-badge
[license-url]: https://github.com/Lokonco/ShellHacks2025/blob/main/LICENSE
[product-screenshot]: images/screenshot.png
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[Electron.com]: https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white
[Electron-url]: https://www.electronjs.org/
[Node.js]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
