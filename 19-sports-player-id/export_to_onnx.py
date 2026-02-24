"""
RF-DETR Small → ONNX Export Script
===================================
Run this in Google Colab or any Linux/Mac machine with pip access.
It will NOT work on Windows without Visual Studio C++ build tools.

Usage (Colab):
  1. Upload players.pt to your Colab session
  2. Run this script
  3. Download rfdetr-player.onnx

Usage (local):
  pip install rfdetr
  python export_to_onnx.py --checkpoint players.pt --output model/rfdetr-player.onnx
"""

import argparse
import os
import sys

def main():
    parser = argparse.ArgumentParser(description='Export RF-DETR Small to ONNX')
    parser.add_argument('--checkpoint', type=str, default='players.pt',
                        help='Path to the .pt checkpoint file')
    parser.add_argument('--output', type=str, default='rfdetr-player.onnx',
                        help='Output ONNX file path')
    parser.add_argument('--num-classes', type=int, default=11,
                        help='Number of classes (default: 11 for basketball)')
    parser.add_argument('--resolution', type=int, default=640,
                        help='Input resolution (default: 640)')
    args = parser.parse_args()

    # Install rfdetr if not present
    try:
        from rfdetr import RFDETRSmall
    except ImportError:
        print('Installing rfdetr...')
        os.system(f'{sys.executable} -m pip install rfdetr')
        from rfdetr import RFDETRSmall

    print(f'Loading checkpoint: {args.checkpoint}')
    model = RFDETRSmall(num_classes=args.num_classes, resolution=args.resolution)
    model.load_checkpoint(args.checkpoint)

    print(f'Exporting to ONNX: {args.output}')
    model.export(args.output)

    size_mb = os.path.getsize(args.output) / 1024 / 1024
    print(f'Done! Output: {args.output} ({size_mb:.1f} MB)')
    print()
    print('Next step: copy rfdetr-player.onnx to 19-sports-player-id/model/')


if __name__ == '__main__':
    main()
