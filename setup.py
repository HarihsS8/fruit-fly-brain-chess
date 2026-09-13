from setuptools import setup, find_packages

setup(
    name="flychess",
    version="0.1.0",
    description="Simulating a Drosophila connectome with Leaky Integrate-and-Fire spiking neurons to play chess",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "chess>=1.10.0",
        "numpy>=1.24.0",
        "scipy>=1.10.0",
        "pyyaml>=6.0",
        "rich>=13.0.0",
    ],
    entry_points={
        "console_scripts": [
            "flychess=flychess.cli:main",
        ],
    },
)
