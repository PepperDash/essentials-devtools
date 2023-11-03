/**
 * Tracks the current mode for the systems dropdown in the top nav
 */
export interface CommonUiState {
  roomId: string; // the program slot or room id
}

export const initialCommonUiState: CommonUiState = {
  roomId: ''
};

