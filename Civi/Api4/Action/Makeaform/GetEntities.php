<?php
namespace Civi\Api4\Action\Makeaform;

use Civi\Api4\Generic\Result;
use Civi\AfformAdmin\AfformAdminMeta;

/**
 * Get list of available entities for the MakeaForm builder.
 *
 * Returns entities that can be used to create submission forms.
 */
class GetEntities extends \Civi\Api4\Generic\AbstractAction {

  public function _run(Result $result) {
    $entities = $this->getEntities();

    foreach ($entities as $name => $entity) {
      $result[] = $entity + ['id' => $name];
    }
  }

  /**
   * Get list of entities from Afform's metadata
   */
  protected function getEntities(): array {
    // Use Afform's metadata which includes the proper list of supported entities
    $afformMeta = AfformAdminMeta::getMetadata();
    $entities = $afformMeta['entities'] ?? [];

    $entityMap = [];
    foreach ($entities as $name => $entity) {
      // Skip the special '*' content block entry
      if ($name === '*') {
        continue;
      }

      $entityMap[$name] = [
        'name' => $entity['entity'] ?? $name,
        'title' => $entity['label'] ?? $name,
        'icon' => $entity['icon'] ?? NULL,
        'type' => $entity['type'] ?? 'primary',
      ];
    }

    return $entityMap;
  }

}
