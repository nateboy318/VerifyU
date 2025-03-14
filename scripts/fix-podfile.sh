#!/bin/bash
# We're no longer adding use_modular_headers!, just running pod install
if [ -f ios/Podfile ]; then
  cd ios && pod install
fi
