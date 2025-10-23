<?php
namespace Civi\Api4\Action\Afform;

use Civi\Api4\Generic\Result;

/**
 * Load admin data for form builder including entities, fields, and blocks.
 *
 * @method $this setLoadBlocks(bool $loadBlocks)
 * @method bool getLoadBlocks()
 */
class LoadAdminData extends \Civi\Api4\Generic\AbstractAction {

  /**
   * Whether to load available blocks
   * @var bool
   */
  protected $loadBlocks = TRUE;

  public function _run(Result $result) {
    $data = [
      'entities' => $this->getEntities(),
      'fields' => [],
      'blocks' => $this->loadBlocks ? $this->getBlocks() : [],
    ];

    $result->exchangeArray([$data]);
  }

  /**
   * Get list of entities
   */
  protected function getEntities(): array {
    $entities = \Civi\Api4\Entity::get(FALSE)
      ->addSelect('name', 'title', 'title_plural', 'description', 'type', 'icon', 'primary_key')
      ->addWhere('searchable', '=', 'primary')
      ->execute();

    $entityMap = [];
    foreach ($entities as $entity) {
      $entityMap[$entity['name']] = $entity;
    }

    return $entityMap;
  }

  /**
   * Get available afform blocks
   */
  protected function getBlocks(): array {
    try {
      $blocks = \Civi\Api4\Afform::get(FALSE)
        ->addWhere('type', '=', 'block')
        ->addSelect('name', 'title', 'description')
        ->execute();

      return $blocks->getArrayCopy();
    }
    catch (\Exception $e) {
      // If blocks aren't available, return empty array
      return [];
    }
  }

}
