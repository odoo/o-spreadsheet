import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { COLORSCALES } from "../../../../../helpers/figures/charts/colormap";
import { _t } from "../../../../../translation";
import {
  ChartColorScale,
  ChartCustomColorScale,
  Color,
  SpreadsheetChildEnv,
} from "../../../../../types";
import { css, cssPropertiesToCss } from "../../../../helpers";
import { isChildEvent } from "../../../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../../../popover";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

css/* scss */ `
  .colormap-container {
    display: flex;
    justify-content: right;
    margin: 5px;
  }
  .colormap-label {
    margin-right: 10px;
  }
  .colormap-preview {
    height: 20px;
    width: 70%;
    border: 1px solid;
  }
  .greys-colormap {
    background: linear-gradient(90deg, white, black);
  }
  .blues-colormap {
    background: linear-gradient(
      90deg,
      #f7fbff 0%,
      #f5fafe 1%,
      #f3f8fe 2%,
      #f2f7fd 3%,
      #eff6fc 4%,
      #eef5fc 5%,
      #ebf3fb 6%,
      #eaf2fb 7%,
      #e7f1fa 8%,
      #e5eff9 9%,
      #e3eef9 10%,
      #e1edf8 11%,
      #dfecf7 12%,
      #ddeaf7 13%,
      #dce9f6 14%,
      #d9e8f5 15%,
      #d8e7f5 16%,
      #d6e5f4 17%,
      #d3e4f3 18%,
      #d2e3f3 19%,
      #d0e1f2 20%,
      #cee0f2 21%,
      #ccdff1 22%,
      #cadef0 23%,
      #c8dcf0 24%,
      #c6dbef 25%,
      #c3daee 26%,
      #bfd8ed 27%,
      #bdd7ec 28%,
      #b9d6ea 29%,
      #b7d4ea 30%,
      #b3d3e8 31%,
      #b0d2e7 32%,
      #add0e6 33%,
      #a9cfe5 34%,
      #a6cee4 35%,
      #a3cce3 36%,
      #a0cbe2 37%,
      #9cc9e1 38%,
      #99c7e0 39%,
      #94c4df 40%,
      #91c3de 41%,
      #8cc0dd 42%,
      #87bddc 43%,
      #84bcdb 44%,
      #7fb9da 45%,
      #7cb7da 46%,
      #77b5d9 47%,
      #74b3d8 48%,
      #6fb0d7 49%,
      #6aaed6 50%,
      #68acd5 51%,
      #64a9d3 52%,
      #61a7d2 53%,
      #5da5d1 54%,
      #5ba3d0 55%,
      #57a0ce 56%,
      #549fcd 57%,
      #519ccc 58%,
      #4d99ca 59%,
      #4a98c9 60%,
      #4695c8 61%,
      #4493c7 62%,
      #4090c5 63%,
      #3e8ec4 64%,
      #3b8bc2 65%,
      #3989c1 66%,
      #3686c0 67%,
      #3383be 68%,
      #3181bd 69%,
      #2e7ebc 70%,
      #2c7cba 71%,
      #2979b9 72%,
      #2676b8 73%,
      #2373b6 74%,
      #2070b4 75%,
      #1f6eb3 76%,
      #1c6bb0 77%,
      #1b69af 78%,
      #1966ad 79%,
      #1764ab 80%,
      #1561a9 81%,
      #135fa7 82%,
      #115ca5 83%,
      #0e59a2 84%,
      #0d57a1 85%,
      #0a549e 86%,
      #09529d 87%,
      #084f99 88%,
      #084d96 89%,
      #084a91 90%,
      #08488e 91%,
      #08458a 92%,
      #084285 93%,
      #084082 94%,
      #083c7d 95%,
      #083a7a 96%,
      #083776 97%,
      #083573 98%,
      #08326e 99%,
      #08306b 100%
    );
  }
  .reds-colormap {
    background: linear-gradient(
      90deg,
      #fff5f0 0%,
      #fff4ee 1%,
      #fff2eb 2%,
      #fff0e9 3%,
      #ffeee7 4%,
      #ffede5 5%,
      #ffebe2 6%,
      #feeae0 7%,
      #fee8dd 8%,
      #fee6da 9%,
      #fee5d8 10%,
      #fee3d6 11%,
      #fee1d4 12%,
      #fedfd0 13%,
      #fedccd 14%,
      #fed9c9 15%,
      #fdd7c6 16%,
      #fdd3c1 17%,
      #fdd0bc 18%,
      #fdcdb9 19%,
      #fdcab5 20%,
      #fdc7b2 21%,
      #fcc4ad 22%,
      #fcc2aa 23%,
      #fcbea5 24%,
      #fcbba1 25%,
      #fcb89e 26%,
      #fcb499 27%,
      #fcb296 28%,
      #fcae92 29%,
      #fcab8f 30%,
      #fca78b 31%,
      #fca588 32%,
      #fca183 33%,
      #fc9d7f 34%,
      #fc9b7c 35%,
      #fc9777 36%,
      #fc9474 37%,
      #fc9070 38%,
      #fc8e6e 39%,
      #fc8a6a 40%,
      #fc8767 41%,
      #fc8464 42%,
      #fc8060 43%,
      #fb7d5d 44%,
      #fb7a5a 45%,
      #fb7757 46%,
      #fb7353 47%,
      #fb7151 48%,
      #fb6d4d 49%,
      #fb694a 50%,
      #fa6648 51%,
      #f96245 52%,
      #f85f43 53%,
      #f75b40 54%,
      #f6583e 55%,
      #f5533b 56%,
      #f4503a 57%,
      #f34c37 58%,
      #f24734 59%,
      #f14432 60%,
      #f0402f 61%,
      #f03d2d 62%,
      #ed392b 63%,
      #eb372a 64%,
      #e83429 65%,
      #e53228 66%,
      #e22e27 67%,
      #de2b25 68%,
      #dc2924 69%,
      #d92523 70%,
      #d72322 71%,
      #d32020 72%,
      #d11e1f 73%,
      #ce1a1e 74%,
      #ca181d 75%,
      #c8171c 76%,
      #c4161c 77%,
      #c2161b 78%,
      #be151a 79%,
      #bc141a 80%,
      #b81419 81%,
      #b61319 82%,
      #b21218 83%,
      #af1117 84%,
      #ac1117 85%,
      #a91016 86%,
      #a60f15 87%,
      #a10e15 88%,
      #9d0d14 89%,
      #980c13 90%,
      #940b13 91%,
      #8e0912 92%,
      #880811 93%,
      #840711 94%,
      #7e0610 95%,
      #7a0510 96%,
      #75030f 97%,
      #71020e 98%,
      #6b010e 99%,
      #67000d 100%
    );
  }
  .greens-colormap {
    background: linear-gradient(
      90deg,
      #f7fcf5 0%,
      #f6fcf4 1%,
      #f4fbf2 2%,
      #f3faf0 3%,
      #f1faee 4%,
      #f0f9ed 5%,
      #eff9eb 6%,
      #edf8ea 7%,
      #ecf8e8 8%,
      #eaf7e6 9%,
      #e9f7e5 10%,
      #e7f6e3 11%,
      #e6f5e1 12%,
      #e4f5df 13%,
      #e2f4dd 14%,
      #dff3da 15%,
      #ddf2d8 16%,
      #dbf1d5 17%,
      #d8f0d2 18%,
      #d6efd0 19%,
      #d3eecd 20%,
      #d1edcb 21%,
      #ceecc8 22%,
      #ccebc6 23%,
      #caeac3 24%,
      #c7e9c0 25%,
      #c4e8bd 26%,
      #c1e6ba 27%,
      #bee5b8 28%,
      #bbe4b4 29%,
      #b8e3b2 30%,
      #b5e1ae 31%,
      #b2e0ac 32%,
      #afdfa8 33%,
      #abdda5 34%,
      #a9dca3 35%,
      #a5db9f 36%,
      #a3da9d 37%,
      #9fd899 38%,
      #9cd797 39%,
      #98d594 40%,
      #95d391 41%,
      #91d28e 42%,
      #8dd08a 43%,
      #8ace88 44%,
      #86cc85 45%,
      #83cb82 46%,
      #7fc97f 47%,
      #7cc87c 48%,
      #78c679 49%,
      #73c476 50%,
      #70c274 51%,
      #6bc072 52%,
      #68be70 53%,
      #63bc6e 54%,
      #60ba6c 55%,
      #5bb86a 56%,
      #58b668 57%,
      #53b466 58%,
      #4eb264 59%,
      #4bb062 60%,
      #46ae60 61%,
      #43ac5e 62%,
      #3fa95c 63%,
      #3ea75a 64%,
      #3ba458 65%,
      #39a257 66%,
      #369f54 67%,
      #339c52 68%,
      #319a50 69%,
      #2f974e 70%,
      #2d954d 71%,
      #2a924a 72%,
      #289049 73%,
      #258d47 74%,
      #228a44 75%,
      #208843 76%,
      #1d8640 77%,
      #1a843f 78%,
      #17813d 79%,
      #157f3b 80%,
      #127c39 81%,
      #107a37 82%,
      #0c7735 83%,
      #097532 84%,
      #077331 85%,
      #03702e 86%,
      #016e2d 87%,
      #006b2b 88%,
      #00682a 89%,
      #006428 90%,
      #006227 91%,
      #005e26 92%,
      #005a24 93%,
      #005723 94%,
      #005321 95%,
      #005120 96%,
      #004d1f 97%,
      #004a1e 98%,
      #00471c 99%,
      #00441b 100%
    );
  }
  .oranges-colormap {
    background: linear-gradient(
      90deg,
      #fff5eb 0%,
      #fff4e9 1%,
      #fff3e6 2%,
      #fff2e5 3%,
      #fff0e2 4%,
      #ffefe0 5%,
      #ffeedd 6%,
      #feeddc 7%,
      #feecd9 8%,
      #feead6 9%,
      #fee9d4 10%,
      #fee8d2 11%,
      #fee7d0 12%,
      #fee5cc 13%,
      #fee4ca 14%,
      #fee2c6 15%,
      #fee0c3 16%,
      #fedebf 17%,
      #fedcbb 18%,
      #fddbb8 19%,
      #fdd9b4 20%,
      #fdd7b1 21%,
      #fdd5ad 22%,
      #fdd4aa 23%,
      #fdd2a6 24%,
      #fdd0a2 25%,
      #fdce9e 26%,
      #fdca99 27%,
      #fdc895 28%,
      #fdc590 29%,
      #fdc38d 30%,
      #fdc088 31%,
      #fdbe84 32%,
      #fdba7f 33%,
      #fdb77a 34%,
      #fdb576 35%,
      #fdb271 36%,
      #fdb06e 37%,
      #fdad69 38%,
      #fdab66 39%,
      #fda762 40%,
      #fda55f 41%,
      #fda25a 42%,
      #fd9f56 43%,
      #fd9d53 44%,
      #fd9a4e 45%,
      #fd984b 46%,
      #fd9547 47%,
      #fd9344 48%,
      #fd9040 49%,
      #fd8c3b 50%,
      #fc8a39 51%,
      #fb8735 52%,
      #fa8532 53%,
      #f9812e 54%,
      #f87f2c 55%,
      #f77b28 56%,
      #f67925 57%,
      #f57622 58%,
      #f4721e 59%,
      #f3701b 60%,
      #f26d17 61%,
      #f26b15 62%,
      #f06712 63%,
      #ee6511 64%,
      #ec620f 65%,
      #eb600e 66%,
      #e85d0c 67%,
      #e65a0b 68%,
      #e4580a 69%,
      #e25508 70%,
      #e15307 71%,
      #de5005 72%,
      #dd4d04 73%,
      #db4a02 74%,
      #d84801 75%,
      #d54601 76%,
      #d04501 77%,
      #cd4401 78%,
      #c84202 79%,
      #c54102 80%,
      #c03f02 81%,
      #bd3e02 82%,
      #b83c02 83%,
      #b33b02 84%,
      #b03903 85%,
      #ab3803 86%,
      #a83703 87%,
      #a43503 88%,
      #a13403 89%,
      #9e3303 90%,
      #9b3203 91%,
      #973003 92%,
      #942f03 93%,
      #912e04 94%,
      #8e2d04 95%,
      #8b2c04 96%,
      #882a04 97%,
      #852904 98%,
      #812804 99%,
      #7f2704 100%
    );
  }
  .purples-colormap {
    background: linear-gradient(
      90deg,
      #fcfbfd 0%,
      #fbfafc 1%,
      #faf9fc 2%,
      #f9f8fb 3%,
      #f8f7fa 4%,
      #f7f6fa 5%,
      #f6f4f9 6%,
      #f5f4f9 7%,
      #f4f2f8 8%,
      #f3f1f7 9%,
      #f2f0f7 10%,
      #f1eff6 11%,
      #f0eef5 12%,
      #eeecf5 13%,
      #edebf4 14%,
      #ebe9f3 15%,
      #eae8f2 16%,
      #e8e6f2 17%,
      #e6e5f1 18%,
      #e4e3f0 19%,
      #e2e2ef 20%,
      #e1e0ee 21%,
      #dfdfed 22%,
      #dedded 23%,
      #dcdcec 24%,
      #dadaeb 25%,
      #d8d8ea 26%,
      #d5d5e9 27%,
      #d3d3e8 28%,
      #d0d1e6 29%,
      #cecfe5 30%,
      #cccce4 31%,
      #cacae3 32%,
      #c7c8e1 33%,
      #c4c5e0 34%,
      #c2c3df 35%,
      #bfc0de 36%,
      #bebedd 37%,
      #bbbbdb 38%,
      #b9b9da 39%,
      #b6b6d8 40%,
      #b4b4d7 41%,
      #b1b1d5 42%,
      #aeadd3 43%,
      #adabd2 44%,
      #aaa8d0 45%,
      #a8a6cf 46%,
      #a5a2cd 47%,
      #a3a0cb 48%,
      #a09dca 49%,
      #9e9ac8 50%,
      #9c98c7 51%,
      #9995c6 52%,
      #9793c5 53%,
      #9490c3 54%,
      #928fc3 55%,
      #8f8cc1 56%,
      #8e8ac0 57%,
      #8b87bf 58%,
      #8885be 59%,
      #8683bd 60%,
      #8380bb 61%,
      #817ebb 62%,
      #7f7bb9 63%,
      #7d78b7 64%,
      #7b74b5 65%,
      #7a71b4 66%,
      #786db2 67%,
      #7669af 68%,
      #7566ae 69%,
      #7262ac 70%,
      #715faa 71%,
      #6f5ba8 72%,
      #6e58a7 73%,
      #6c54a5 74%,
      #6950a3 75%,
      #684da1 76%,
      #66499f 77%,
      #65479e 78%,
      #63439c 79%,
      #61409b 80%,
      #5f3c99 81%,
      #5e3a98 82%,
      #5c3696 83%,
      #5a3294 84%,
      #582f93 85%,
      #562b91 86%,
      #552890 87%,
      #53258e 88%,
      #51228d 89%,
      #4f1f8b 90%,
      #4e1c8a 91%,
      #4c1888 92%,
      #4a1587 93%,
      #491285 94%,
      #470f84 95%,
      #460c83 96%,
      #440981 97%,
      #420680 98%,
      #40027e 99%,
      #3f007d 100%
    );
  }
  .viridis-colormap {
    background: linear-gradient(90deg, rgb(68, 1, 84), rgb(33, 145, 140), rgb(253, 231, 37));
  }
  .cividis-colormap {
    background: linear-gradient(
      90deg,
      #00224e 0%,
      #002451 1%,
      #002656 2%,
      #002859 3%,
      #002a5f 4%,
      #002b62 5%,
      #002d68 6%,
      #002e6c 7%,
      #003070 8%,
      #013271 9%,
      #083370 10%,
      #123570 11%,
      #163770 12%,
      #1c396f 13%,
      #203a6f 14%,
      #243c6e 15%,
      #273e6e 16%,
      #2b406d 17%,
      #2f426d 18%,
      #32436d 19%,
      #35456c 20%,
      #38476c 21%,
      #3b496c 22%,
      #3d4a6c 23%,
      #404c6c 24%,
      #434e6c 25%,
      #45506c 26%,
      #48526c 27%,
      #4a536c 28%,
      #4d556c 29%,
      #4f576c 30%,
      #52596d 31%,
      #545a6d 32%,
      #565c6d 33%,
      #595e6e 34%,
      #5b606e 35%,
      #5e626e 36%,
      #5f636f 37%,
      #62656f 38%,
      #646770 39%,
      #666970 40%,
      #686a71 41%,
      #6b6d72 42%,
      #6d6f72 43%,
      #6f7073 44%,
      #727274 45%,
      #737475 46%,
      #767676 47%,
      #777777 48%,
      #7a7a78 49%,
      #7d7c78 50%,
      #7e7d78 51%,
      #817f78 52%,
      #838179 53%,
      #868379 54%,
      #888578 55%,
      #8b8778 56%,
      #8d8878 57%,
      #908b78 58%,
      #928d78 59%,
      #948e77 60%,
      #979177 61%,
      #999277 62%,
      #9c9576 63%,
      #9e9676 64%,
      #a19975 65%,
      #a39a74 66%,
      #a69c74 67%,
      #a99f73 68%,
      #aba072 69%,
      #aea371 70%,
      #b0a571 71%,
      #b4a76f 72%,
      #b6a96f 73%,
      #b9ab6d 74%,
      #bcae6c 75%,
      #beaf6b 76%,
      #c1b26a 77%,
      #c3b369 78%,
      #c6b667 79%,
      #c8b866 80%,
      #ccba64 81%,
      #cebc63 82%,
      #d1bf61 83%,
      #d4c15f 84%,
      #d6c35d 85%,
      #dac65b 86%,
      #dcc859 87%,
      #dfca57 88%,
      #e1cc55 89%,
      #e5cf52 90%,
      #e7d150 91%,
      #ead34c 92%,
      #eed649 93%,
      #f0d846 94%,
      #f3db42 95%,
      #f6dd3f 96%,
      #f9e03a 97%,
      #fce236 98%,
      #fee535 99%,
      #fee838 100%
    );
  }
  .rainbow-colormap {
    background: linear-gradient(
      90deg,
      rgba(147, 79, 196, 1) 0%,
      rgba(157, 79, 189, 1) 1%,
      rgba(163, 79, 184, 1) 2%,
      rgba(172, 79, 178, 1) 3%,
      rgba(178, 79, 173, 1) 4%,
      rgba(186, 79, 167, 1) 5%,
      rgba(192, 79, 162, 1) 6%,
      rgba(199, 79, 156, 1) 7%,
      rgba(201, 79, 156, 1) 8%,
      rgba(208, 79, 148, 1) 9%,
      rgba(213, 79, 143, 1) 10%,
      rgba(219, 79, 136, 1) 11%,
      rgba(225, 79, 130, 1) 12%,
      rgba(231, 79, 123, 1) 13%,
      rgba(237, 79, 117, 1) 14%,
      rgba(243, 79, 109, 1) 15%,
      rgba(248, 79, 103, 1) 16%,
      rgba(250, 79, 91, 1) 17%,
      rgba(252, 79, 90, 1) 18%,
      rgba(255, 79, 79, 1) 19%,
      rgba(254, 86, 80, 1) 20%,
      rgba(255, 86, 77, 1) 21%,
      rgba(255, 92, 76, 1) 22%,
      rgba(255, 99, 75, 1) 23%,
      rgba(255, 103, 73, 1) 24%,
      rgba(255, 106, 73, 1) 25%,
      rgba(255, 113, 71, 1) 26%,
      rgba(255, 118, 70, 1) 27%,
      rgba(255, 121, 69, 1) 28%,
      rgba(255, 124, 68, 1) 29%,
      rgba(255, 128, 67, 1) 30%,
      rgba(255, 133, 66, 1) 31%,
      rgba(255, 140, 64, 1) 32%,
      rgba(255, 145, 63, 1) 33%,
      rgba(255, 150, 62, 1) 34%,
      rgba(255, 156, 61, 1) 35%,
      rgba(255, 159, 60, 1) 36%,
      rgba(255, 163, 59, 1) 37%,
      rgba(255, 167, 58, 1) 38%,
      rgba(255, 171, 57, 1) 39%,
      rgba(255, 175, 56, 1) 40%,
      rgba(251, 180, 65, 1) 41%,
      rgba(248, 183, 71, 1) 42%,
      rgba(245, 186, 78, 1) 43%,
      rgba(242, 189, 84, 1) 44%,
      rgba(238, 193, 92, 1) 45%,
      rgba(236, 196, 97, 1) 46%,
      rgba(233, 199, 102, 1) 47%,
      rgba(232, 200, 105, 1) 48%,
      rgba(229, 203, 111, 1) 49%,
      rgba(226, 206, 117, 1) 50%,
      rgba(222, 210, 124, 1) 51%,
      rgba(210, 213, 127, 1) 52%,
      rgba(207, 215, 131, 1) 53%,
      rgba(197, 219, 135, 1) 54%,
      rgba(186, 223, 140, 1) 55%,
      rgba(177, 227, 144, 1) 56%,
      rgba(165, 232, 149, 1) 57%,
      rgba(156, 235, 153, 1) 58%,
      rgba(145, 239, 157, 1) 59%,
      rgba(140, 241, 159, 1) 60%,
      rgba(129, 245, 164, 1) 61%,
      rgba(118, 249, 169, 1) 62%,
      rgba(109, 252, 173, 1) 63%,
      rgba(107, 247, 175, 1) 64%,
      rgba(106, 244, 177, 1) 65%,
      rgba(104, 239, 179, 1) 66%,
      rgba(103, 236, 180, 1) 67%,
      rgba(101, 231, 182, 1) 68%,
      rgba(100, 228, 184, 1) 69%,
      rgba(98, 224, 186, 1) 70%,
      rgba(97, 220, 187, 1) 71%,
      rgba(95, 216, 189, 1) 72%,
      rgba(94, 212, 191, 1) 73%,
      rgba(92, 208, 192, 1) 74%,
      rgba(92, 206, 193, 1) 75%,
      rgba(90, 202, 195, 1) 76%,
      rgba(88, 197, 197, 1) 77%,
      rgba(87, 193, 198, 1) 78%,
      rgba(85, 188, 200, 1) 79%,
      rgba(84, 185, 202, 1) 80%,
      rgba(82, 180, 204, 1) 81%,
      rgba(81, 176, 205, 1) 82%,
      rgba(79, 171, 207, 1) 83%,
      rgba(78, 168, 209, 1) 84%,
      rgba(72, 159, 209, 1) 85%,
      rgba(71, 156, 210, 1) 86%,
      rgba(67, 149, 210, 1) 87%,
      rgba(60, 138, 211, 1) 88%,
      rgba(56, 130, 211, 1) 89%,
      rgba(51, 119, 212, 1) 90%,
      rgba(46, 110, 212, 1) 91%,
      rgba(40, 99, 213, 1) 92%,
      rgba(35, 91, 213, 1) 93%,
      rgba(29, 79, 214, 1) 94%,
      rgba(25, 71, 214, 1) 95%,
      rgba(18, 59, 215, 1) 96%,
      rgba(14, 52, 215, 1) 97%,
      rgba(9, 42, 216, 1) 98%,
      rgba(7, 38, 216, 1) 99%,
      rgba(0, 25, 217, 1) 100%
    );
  }
  .custom-colormap {
    border: none !important;
  }
  .custom-colormap-container {
    border-bottom: 1px solid #d8dadd;
  }
`;

//https://victorpoughon.fr/css-gradients-colorcet/

const DEFAULT_CUSTOM_COLOR_SCALE: ChartCustomColorScale = {
  minColor: "#FFF5EB",
  midColor: "#FD8D3C",
  maxColor: "#7F2704",
};

interface Props {
  definition: { colorScale: ChartColorScale; showColorBar?: boolean };
  onUpdateColorScale: (colorscale: ChartColorScale) => void;
  onShowColorBarChange?: (show: boolean) => void;
}

interface ColorScalePickerState {
  popoverStyle: string;
  popoverProps: PopoverProps | undefined;
}

export class ColorScalePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ColorScalePicker";
  static components = {
    Section,
    Popover,
    RoundColorPicker,
    Checkbox,
  };
  static props = {
    definition: Object,
    onUpdateColorScale: Function,
    onShowColorBarChange: { type: Function, optional: true },
  };

  COLORSCALES = COLORSCALES.map((colormap) => ({
    value: colormap,
    label: _t(colormap.charAt(0).toUpperCase() + colormap.slice(1)),
    className: `${colormap}-colormap`,
  }));

  state = useState<ColorScalePickerState>({ popoverProps: undefined, popoverStyle: "" });
  popoverRef = useRef("popoverRef");

  setup(): void {
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });
  }

  onExternalClick(ev: MouseEvent) {
    if (isChildEvent(this.popoverRef.el?.parentElement, ev)) {
      return;
    }
    this.closePopover();
  }

  get currentColormap(): ChartColorScale {
    return this.props.definition.colorScale || "greys";
  }

  get currentColormapPreview(): string {
    const currentColormap = this.currentColormap;
    if (typeof currentColormap === "object") {
      return "custom-colormap";
    }
    return currentColormap + "-colormap";
  }

  get currentColormapLabel(): string {
    if (typeof this.currentColormap === "object") {
      return _t("Custom");
    }
    const currentColormap = this.currentColormap;
    return _t(currentColormap.charAt(0).toUpperCase() + currentColormap.slice(1));
  }

  onColormapChange(value): void {
    if (value === "custom") {
      this.props.onUpdateColorScale(DEFAULT_CUSTOM_COLOR_SCALE);
    } else {
      this.props.onUpdateColorScale(value as ChartColorScale);
    }
    this.closePopover();
  }

  onPointerDown(ev: PointerEvent) {
    if (this.state.popoverProps) {
      this.closePopover();
      return;
    }
    const target = ev.currentTarget as HTMLElement;
    const { bottom, right, width } = target.getBoundingClientRect();
    this.state.popoverProps = {
      anchorRect: { x: right, y: bottom, width: 0, height: 0 },
      positioning: "top-right",
      verticalOffset: 0,
    };

    this.state.popoverStyle = cssPropertiesToCss({ width: `${width}px` });
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }

  get customColorScale(): ChartCustomColorScale | undefined {
    if (typeof this.currentColormap === "object") {
      return this.currentColormap;
    }
    return undefined;
  }

  getCustomColorScaleColor(color: "minColor" | "midColor" | "maxColor") {
    return this.customColorScale?.[color] ?? "";
  }

  setCustomColorScaleColor(colorType: "minColor" | "midColor" | "maxColor", color: Color) {
    if (!color && colorType !== "midColor") {
      color = "#fff";
    }
    const customColorScale = this.customColorScale;
    if (!customColorScale) {
      return;
    }
    this.props.onUpdateColorScale({ ...customColorScale, [colorType]: color });
  }
}
